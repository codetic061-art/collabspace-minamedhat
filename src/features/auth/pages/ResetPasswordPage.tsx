import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { applyServerValidationErrors, authService, toAppError } from '@/shared/api';
import { Button } from '@/shared/ui';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordInput } from '../components/PasswordInput';
import { useSession } from '../context/SessionContext';
import { useRateLimitCountdown } from '../hooks/useRateLimitCountdown';
import { useRecoveryMetaReferrer } from '../hooks/useRecoveryMetaReferrer';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas/auth.schemas';

const KNOWN_FIELDS: readonly (keyof ResetPasswordFormValues)[] = [
  'password',
  'password_confirmation',
];

interface ResetLocationState {
  email: string;
  otp: string;
}

function readResetLocationState(state: unknown): ResetLocationState | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'email' in state &&
    'otp' in state &&
    typeof state.email === 'string' &&
    typeof state.otp === 'string' &&
    state.email.trim().length > 0 &&
    /^\d{6}$/.test(state.otp)
  ) {
    return {
      email: state.email.trim(),
      otp: state.otp,
    };
  }
  return null;
}

/**
 * Reset Password step (§12.4, ID-21): enforces min 8 chars + confirmation, clears any local session,
 * and returns cleanly to `/sign-in` without auto-logging in.
 */
export function ResetPasswordPage() {
  useRecoveryMetaReferrer();

  const location = useLocation();
  const navigate = useNavigate();
  const { clearSessionAfterReset } = useSession();
  const rateLimit = useRateLimitCountdown();
  const resetState = readResetLocationState(location.state);

  const resetMutation = useMutation({
    mutationFn: authService.resetPassword,
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      password_confirmation: '',
    },
  });

  if (!resetState) {
    return <Navigate to="/forgot-password" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await resetMutation.mutateAsync({
        email: resetState.email,
        otp: resetState.otp,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      clearSessionAfterReset();
      navigate('/sign-in', {
        replace: true,
        state: { passwordResetSuccess: true },
      });
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'rate_limited') {
        rateLimit.startCountdown(appError.retryAfterSeconds);
      }
      applyServerValidationErrors(error, setError, KNOWN_FIELDS);
    }
  });

  const serverError = errors.root?.serverError?.message;

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a new password for your account"
      footer={
        <Link to="/sign-in" className="font-medium text-link hover:underline">
          Back to Sign in
        </Link>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <PasswordInput
          label="New Password"
          labelVariant="notch"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordInput
          label="Confirm Password"
          labelVariant="notch"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />

        {serverError ? (
          <div
            role="alert"
            className="rounded-input border border-danger/30 bg-danger-tint px-4 py-3 text-sm text-danger"
          >
            <p>{serverError}</p>
            {rateLimit.isRateLimited ? (
              <p className="mt-1 text-xs">
                Try again in {rateLimit.remainingSeconds}s.
              </p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingText="Resetting password..."
          disabled={isSubmitting || rateLimit.isRateLimited}
        >
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
