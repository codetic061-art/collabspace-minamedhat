import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { applyServerValidationErrors, authService, toAppError } from '@/shared/api';
import { sanitizeReturnPath } from '@/shared/lib';
import { Button, Checkbox, Input } from '@/shared/ui';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordInput } from '../components/PasswordInput';
import { useSession } from '../context/SessionContext';
import { useRateLimitCountdown } from '../hooks/useRateLimitCountdown';
import { signInSchema, type SignInFormValues } from '../schemas/auth.schemas';

const KNOWN_FIELDS: readonly (keyof SignInFormValues)[] = ['email', 'password', 'remember'];

function hasPasswordResetSuccess(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'passwordResetSuccess' in state &&
    state.passwordResetSuccess === true
  );
}

/** Sign-in page (`1:10523`, M1, M3) with duplicate-submit guard, generic 401 messaging, and 422 mapping. */
export function SignInPage() {
  const { completeAuth } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const rateLimit = useRateLimitCountdown();

  const passwordResetSuccess = hasPasswordResetSuccess(location.state);
  const redirectTarget = sanitizeReturnPath(searchParams.get('redirectTo'), '/');

  const signInMutation = useMutation({
    mutationFn: authService.login,
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await signInMutation.mutateAsync({
        email: values.email,
        password: values.password,
        remember: values.remember,
      });
      await completeAuth(session.token, { remember: values.remember });
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'unauthorized') {
        setError('root.serverError', {
          type: 'server',
          message: appError.message || 'Invalid email or password.',
        });
        return;
      }
      if (appError.kind === 'rate_limited') {
        rateLimit.startCountdown(appError.retryAfterSeconds);
      }
      applyServerValidationErrors(error, setError, KNOWN_FIELDS);
    }
  });

  const serverError = errors.root?.serverError?.message;

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Sign in to your CollabSpace account"
      footer={
        <span>
          Don&apos;t have an account?{' '}
          <Link to="/sign-up" className="font-medium text-link hover:underline">
            Sign up
          </Link>
        </span>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {passwordResetSuccess ? (
          <div
            role="status"
            className="rounded-input border border-success/30 bg-success-tint px-4 py-3 text-sm text-ink"
          >
            Your password has been reset. Sign in with your new password.
          </div>
        ) : null}

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

        <PasswordInput
          label="Password"
          labelVariant="notch"
          autoComplete="current-password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between gap-3">
          <Checkbox label="Remember Me" {...register('remember')} />
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-link hover:underline whitespace-nowrap"
          >
            Forgot password?
          </Link>
        </div>

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
          loadingText="Signing in..."
          disabled={isSubmitting || rateLimit.isRateLimited}
        >
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
