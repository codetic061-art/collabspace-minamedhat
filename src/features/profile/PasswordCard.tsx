import { useForm } from 'react-hook-form';
import { applyServerValidationErrors, profileService } from '@/shared/api';
import { Button, Card, Input, useToast } from '@/shared/ui';

interface PasswordValues {
  current_password: string;
  password: string;
  password_confirmation: string;
}
const passwordFields = ['current_password', 'password', 'password_confirmation'] as const;

function usePasswordChange() {
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>();
  const submit = handleSubmit(async (values) => {
    if (values.password !== values.password_confirmation) {
      setError(
        'password_confirmation',
        { message: 'Passwords must match.' },
        { shouldFocus: true },
      );
      return;
    }
    try {
      await profileService.changePassword(values);
      reset();
      showToast({ message: 'Password changed.', tone: 'success' });
    } catch (error) {
      applyServerValidationErrors(error, setError, passwordFields);
    }
  });
  return { register, errors, isSubmitting, submit };
}

export function PasswordCard() {
  const { register, errors, isSubmitting, submit } = usePasswordChange();
  return (
    <section className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
      <div>
        <h2 className="text-xl font-semibold">Security</h2>
        <p className="mt-2 text-sm text-body">Change your password here.</p>
      </div>
      <Card variant="settings" className="min-w-0 space-y-5">
        <form onSubmit={submit} noValidate className="space-y-5">
          <Input
            label="Current password"
            labelVariant="top"
            type="password"
            autoComplete="current-password"
            error={errors.current_password?.message}
            {...register('current_password', { required: 'Enter your current password.' })}
          />
          <Input
            label="New password"
            labelVariant="top"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Enter a new password.',
              minLength: { value: 8, message: 'Use at least 8 characters.' },
            })}
          />
          <Input
            label="Confirm new password"
            labelVariant="top"
            type="password"
            autoComplete="new-password"
            error={errors.password_confirmation?.message}
            {...register('password_confirmation', { required: 'Confirm your new password.' })}
          />
          {errors.root?.serverError?.message && (
            <p role="alert" className="text-sm text-danger">
              {errors.root.serverError.message}
            </p>
          )}
          <Button type="submit" isLoading={isSubmitting} loadingText="Saving...">
            Change password
          </Button>
        </form>
      </Card>
    </section>
  );
}

