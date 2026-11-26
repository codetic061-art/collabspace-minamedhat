import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { applyServerValidationErrors, authService, toAppError } from '@/shared/api';
import { Button } from '@/shared/ui';
import { AuthLayout } from '../components/AuthLayout';
import { OtpInputGroup } from '../components/OtpInputGroup';
import { useRateLimitCountdown } from '../hooks/useRateLimitCountdown';
import { useRecoveryMetaReferrer } from '../hooks/useRecoveryMetaReferrer';
import { verifyOtpSchema, type VerifyOtpFormValues } from '../schemas/auth.schemas';

const RESEND_COOLDOWN_SECONDS = 60;
const DEFAULT_EXPIRY_MINUTES = 10;
const KNOWN_FIELDS: readonly (keyof VerifyOtpFormValues)[] = ['otp'];

interface VerifyLocationState {
  email: string;
  expiresInMinutes: number;
}

function readVerifyLocationState(state: unknown): VerifyLocationState | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'email' in state &&
    typeof state.email === 'string' &&
    state.email.trim().length > 0
  ) {
    const expiresRaw =
      'expiresInMinutes' in state && typeof state.expiresInMinutes === 'number'
        ? state.expiresInMinutes
        : DEFAULT_EXPIRY_MINUTES;
    return {
      email: state.email.trim(),
      expiresInMinutes: expiresRaw > 0 ? expiresRaw : DEFAULT_EXPIRY_MINUTES,
    };
  }
  return null;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Verify Code step (§12.3, ID-21): enforces 6 numeric digits, runs expiry & 60s resend timers,
 * surfaces server 422/lockout/429 responses, and holds email/OTP strictly in memory.
 */
export function VerifyCodePage() {
  useRecoveryMetaReferrer();

  const location = useLocation();
  const navigate = useNavigate();
  const rateLimit = useRateLimitCountdown();
  const recoveryState = readVerifyLocationState(location.state);

  const [expirySeconds, setExpirySeconds] = useState(
    () => (recoveryState?.expiresInMinutes ?? DEFAULT_EXPIRY_MINUTES) * 60,
  );
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!recoveryState) {
      return;
    }

    const interval = globalThis.setInterval(() => {
      setExpirySeconds((prev) => (prev <= 1 ? 0 : prev - 1));
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      globalThis.clearInterval(interval);
    };
  }, [recoveryState]);

  const verifyMutation = useMutation({
    mutationFn: authService.verifyResetOtp,
  });

  const resendMutation = useMutation({
    mutationFn: authService.forgotPassword,
  });

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: '' },
  });

  if (!recoveryState) {
    return <Navigate to="/forgot-password" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setResendNotice(null);
    try {
      await verifyMutation.mutateAsync({
        email: recoveryState.email,
        otp: values.otp,
      });
      navigate('/reset-password', {
        state: {
          email: recoveryState.email,
          otp: values.otp,
        },
      });
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'rate_limited') {
        rateLimit.startCountdown(appError.retryAfterSeconds);
      }
      applyServerValidationErrors(error, setError, KNOWN_FIELDS);
    }
  });

  const handleResend = async () => {
    if (resendSeconds > 0 || resendMutation.isPending || rateLimit.isRateLimited) {
      return;
    }

    setResendNotice(null);
    clearErrors('root.serverError');
    try {
      const result = await resendMutation.mutateAsync({ email: recoveryState.email });
      setExpirySeconds(result.expires_in_minutes * 60);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setResendNotice(result.message);
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'rate_limited') {
        rateLimit.startCountdown(appError.retryAfterSeconds);
      }
      applyServerValidationErrors(error, setError, KNOWN_FIELDS);
    }
  };

  const serverError = errors.root?.serverError?.message;
  const isExpired = expirySeconds <= 0;

  return (
    <AuthLayout
      title="Verify code"
      subtitle={`Enter the 6-digit code sent to ${recoveryState.email}`}
      footer={
        <Link to="/forgot-password" className="font-medium text-link hover:underline">
          Use a different email
        </Link>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <Controller
          control={control}
          name="otp"
          render={({ field }) => (
            <OtpInputGroup
              value={field.value}
              onChange={field.onChange}
              disabled={isSubmitting}
              error={errors.otp?.message}
            />
          )}
        />

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {isExpired
              ? 'Verification code expired. Request a new code.'
              : `Code expires in ${formatCountdown(expirySeconds)}`}
          </span>

          <button
            type="button"
            disabled={resendSeconds > 0 || resendMutation.isPending || rateLimit.isRateLimited}
            onClick={() => void handleResend()}
            className="font-medium text-link hover:underline disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline cursor-pointer"
          >
            {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
          </button>
        </div>

        {resendNotice ? (
          <div
            role="status"
            className="rounded-input border border-success/30 bg-success-tint px-4 py-3 text-sm text-ink"
          >
            {resendNotice}
          </div>
        ) : null}

        {serverError ? (
          <div
            role="alert"
            className="rounded-input border border-danger/30 bg-danger-tint px-4 py-3 text-sm text-danger"
          >
            <p>{serverError}</p>
            {rateLimit.isRateLimited ? (
              <p className="mt-1 text-xs">Try again in {rateLimit.remainingSeconds}s.</p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingText="Verifying..."
          disabled={isSubmitting || isExpired || rateLimit.isRateLimited}
        >
          Verify code
        </Button>
      </form>
    </AuthLayout>
  );
}
