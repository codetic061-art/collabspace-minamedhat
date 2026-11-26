import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Mail, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { applyServerValidationErrors, authService, toAppError } from '@/shared/api';
import { Button, Input } from '@/shared/ui';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordInput } from '../components/PasswordInput';
import { useSession } from '../context/SessionContext';
import { useRateLimitCountdown } from '../hooks/useRateLimitCountdown';
import { signUpSchema, type SignUpFormValues } from '../schemas/auth.schemas';

const KNOWN_FIELDS: readonly (keyof SignUpFormValues)[] = [
  'name',
  'email',
  'password',
  'password_confirmation',
];

/** Registration page (`1:10573`, §12.5) sending the 4 OpenAPI fields and completing `/auth/me`. */
export function SignUpPage() {
  const { completeAuth } = useSession();
  const navigate = useNavigate();
  const rateLimit = useRateLimitCountdown();

  const registerMutation = useMutation({
    mutationFn: authService.register,
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await registerMutation.mutateAsync({
        name: values.name,
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      await completeAuth(session.token, { remember: false });
      navigate('/', { replace: true });
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
      title="Create account"
      subtitle="Join your team on CollabSpace"
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium text-link hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Full Name"
          labelVariant="notch"
          type="text"
          autoComplete="name"
          placeholder="Jordan Lee"
          leadingIcon={<User className="h-4 w-4" aria-hidden="true" />}
          error={errors.name?.message}
          {...register('name')}
        />

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordInput
          label="Confirm Password"
          labelVariant="notch"
          autoComplete="new-password"
          placeholder="Re-enter your password"
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
              <p className="mt-1 text-xs">Try again in {rateLimit.remainingSeconds}s.</p>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingText="Creating account..."
          disabled={isSubmitting || rateLimit.isRateLimited}
        >
          Sign up
        </Button>
      </form>
    </AuthLayout>
  );
}
