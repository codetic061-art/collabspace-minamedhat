import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { applyServerValidationErrors, authService, toAppError } from '@/shared/api';
import { Button, Input } from '@/shared/ui';
import { AuthLayout } from '../components/AuthLayout';
import { useRateLimitCountdown } from '../hooks/useRateLimitCountdown';
import { useRecoveryMetaReferrer } from '../hooks/useRecoveryMetaReferrer';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../schemas/auth.schemas';

const KNOWN_FIELDS: readonly (keyof ForgotPasswordFormValues)[] = ['email'];

/**
 * Forgot Password step (§12.2, ID-21): keeps email in React Router state rather than URLs
 * and follows the same non-enumerating flow regardless of whether an account exists.
 */
export function ForgotPasswordPage() {
  useRecoveryMetaReferrer();

  const navigate = useNavigate();
  const rateLimit = useRateLimitCountdown();

  const forgotMutation = useMutation({
    mutationFn: authService.forgotPassword,
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await forgotMutation.mutateAsync({ email: values.email });
      navigate('/verify-code', {
        state: {
          email: values.email,
          expiresInMinutes: response.expires_in_minutes,
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

  const serverError = errors.root?.serverError?.message;

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email address to receive a 6-digit verification code"
      footer={
        <Link to="/sign-in" className="font-medium text-link hover:underline">
          Back to Sign in
        </Link>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email Address"
          labelVariant="notch"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          error={errors.email?.message}
          {...register('email')}
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
          loadingText="Sending code..."
          disabled={isSubmitting || rateLimit.isRateLimited}
        >
          Send verification code
        </Button>
      </form>
    </AuthLayout>
  );
}
