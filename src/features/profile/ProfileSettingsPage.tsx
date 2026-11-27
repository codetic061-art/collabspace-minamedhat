import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useSession } from '@/features/auth';
import {
  applyServerValidationErrors,
  getErrorMessage,
  profileService,
  toAppError,
  type AvailabilityStatus,
  type ProfileMeData,
} from '@/shared/api';
import { Avatar, Button, Card, Field, Input, Skeleton, SkeletonRegion } from '@/shared/ui';

interface SettingsValues {
  name: string;
  email: string;
  phone: string;
  available_status: AvailabilityStatus;
  job_title: string;
  years_of_experience: string;
  current_project_id: string;
  about: string;
}
interface PasswordValues {
  current_password: string;
  password: string;
  password_confirmation: string;
}
const settingsFields = [
  'name',
  'email',
  'phone',
  'available_status',
  'job_title',
  'years_of_experience',
  'current_project_id',
  'about',
] as const;
const passwordFields = ['current_password', 'password', 'password_confirmation'] as const;
const selectClass =
  'min-h-touch w-full rounded-pill border border-profile-border bg-surface px-4 text-sm';

async function validateAvatar(file: File): Promise<string | null> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return 'Choose a JPG, PNG, or WebP image.';
  if (file.size > 2 * 1024 * 1024) return 'The image must be 2 MB or less.';
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(
        image.width > 4000 || image.height > 4000
          ? 'The image must be at most 4000 × 4000 pixels.'
          : null,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('Choose a valid image.');
    };
    image.src = url;
  });
}

function PasswordCard() {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>();
  const [saved, setSaved] = useState(false);
  const submit = handleSubmit(async (values) => {
    setSaved(false);
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
      setSaved(true);
    } catch (error) {
      applyServerValidationErrors(error, setError, passwordFields);
    }
  });
  return (
    <section className="grid gap-5 md:grid-cols-[1fr_2fr]">
      <div>
        <h2 className="text-xl font-semibold">Security</h2>
        <p className="mt-2 text-sm text-body">Change your password here.</p>
      </div>
      <Card className="space-y-5">
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
          {saved && <p role="status">Password changed.</p>}
          <Button type="submit" isLoading={isSubmitting} loadingText="Saving...">
            Change password
          </Button>
        </form>
      </Card>
    </section>
  );
}

function SettingsForm({ me }: { me: ProfileMeData }) {
  const { retryRestore } = useSession();
  const { user, projects } = me;
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState('');
  const [validatingAvatar, setValidatingAvatar] = useState(false);
  const avatarSelection = useRef(0);
  const [removing, setRemoving] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettingsValues>({
    defaultValues: {
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      available_status: user.available_status,
      job_title: user.job_title ?? '',
      years_of_experience: String(user.years_of_experience),
      current_project_id: user.current_project_id ? String(user.current_project_id) : '',
      about: user.about ?? '',
    },
  });
  const submit = handleSubmit(async (values) => {
    if (avatarError || validatingAvatar) return;
    try {
      await profileService.updateProfile({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        available_status: values.available_status,
        job_title: values.job_title.trim(),
        years_of_experience: Number(values.years_of_experience),
        current_project_id: values.current_project_id ? Number(values.current_project_id) : null,
        about: values.about.trim(),
        avatar,
      });
      await retryRestore();
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'validation' && appError.errors.avatar?.[0]) {
        setAvatarError(appError.errors.avatar[0]);
      }
      applyServerValidationErrors(error, setError, settingsFields);
    }
  });
  async function remove() {
    if (removing) return;
    setRemoving(true);
    setAvatarError('');
    try {
      await profileService.removeAvatar();
      setAvatar(null);
      await retryRestore();
    } catch (error) {
      setAvatarError(getErrorMessage(toAppError(error)));
    } finally {
      setRemoving(false);
    }
  }
  return (
    <div className="space-y-10">
      <div className="flex items-center gap-5">
        <Avatar name={user.name} src={user.avatar_url} size="xl" />
        <div>
          <h1 className="text-3xl font-bold">Profile settings</h1>
          <Link to="/profile" className="text-sm text-primary">
            Back to profile
          </Link>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="space-y-10">
        <section className="grid gap-5 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-xl font-semibold">Personal Info</h2>
            <p className="mt-2 text-sm text-body">
              You can change your personal information settings here.
            </p>
          </div>
          <Card className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Full name"
                labelVariant="top"
                error={errors.name?.message}
                {...register('name', {
                  required: 'Enter your name.',
                  maxLength: { value: 255, message: 'Maximum 255 characters.' },
                })}
              />
              <Input
                label="Email address"
                labelVariant="top"
                type="email"
                error={errors.email?.message}
                {...register('email', {
                  required: 'Enter your email.',
                  maxLength: { value: 255, message: 'Maximum 255 characters.' },
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email.' },
                })}
              />
              <Input
                label="Phone number"
                labelVariant="top"
                type="tel"
                error={errors.phone?.message}
                {...register('phone', {
                  maxLength: { value: 30, message: 'Maximum 30 characters.' },
                })}
              />
              <Field label="Availability status" error={errors.available_status?.message}>
                {(props) => (
                  <select {...props} {...register('available_status')} className={selectClass}>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="away">Away</option>
                    <option value="offline">Offline</option>
                  </select>
                )}
              </Field>
            </div>
            <Field
              label="Avatar"
              error={avatarError}
              hint="JPG, PNG or WebP; up to 2 MB and 4000 × 4000 pixels."
            >
              {(props) => (
                <input
                  {...props}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setAvatar(null);
                    setAvatarError('');
                    const selection = ++avatarSelection.current;
                    setValidatingAvatar(Boolean(file));
                    if (file)
                      void validateAvatar(file).then((message) => {
                        if (selection !== avatarSelection.current) return;
                        setValidatingAvatar(false);
                        setAvatarError(message ?? '');
                        if (!message) setAvatar(file);
                      });
                  }}
                />
              )}
            </Field>
            {user.avatar_url && (
              <Button
                variant="outline"
                disabled={removing || isSubmitting}
                onClick={() => void remove()}
              >
                {removing ? 'Removing...' : 'Remove avatar'}
              </Button>
            )}
          </Card>
        </section>
        <section className="grid gap-5 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-xl font-semibold">Experience</h2>
            <p className="mt-2 text-sm text-body">You can change your experience settings here.</p>
          </div>
          <Card className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Job title"
              labelVariant="top"
              error={errors.job_title?.message}
              {...register('job_title', {
                maxLength: { value: 255, message: 'Maximum 255 characters.' },
              })}
            />
            <Input
              label="Years of experience"
              labelVariant="top"
              type="number"
              min="0"
              max="60"
              error={errors.years_of_experience?.message}
              {...register('years_of_experience', {
                required: 'Enter years of experience.',
                min: { value: 0, message: 'Must be at least 0.' },
                max: { value: 60, message: 'Must be at most 60.' },
                validate: (value) => Number.isInteger(Number(value)) || 'Enter a whole number.',
              })}
            />
            <Field
              className="sm:col-span-2"
              label="Current project"
              error={errors.current_project_id?.message}
            >
              {(props) => (
                <select {...props} {...register('current_project_id')} className={selectClass}>
                  <option value="">No current project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field className="sm:col-span-2" label="About" error={errors.about?.message}>
              {(props) => (
                <textarea
                  {...props}
                  {...register('about', {
                    maxLength: { value: 2000, message: 'Maximum 2000 characters.' },
                  })}
                  className="min-h-28 w-full rounded-input border border-profile-border p-3"
                />
              )}
            </Field>
          </Card>
        </section>
        {errors.root?.serverError?.message && (
          <p role="alert" className="text-sm text-danger">
            {errors.root.serverError.message}
          </p>
        )}
        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={removing || validatingAvatar}
          loadingText="Saving..."
        >
          Save
        </Button>
      </form>
      <PasswordCard />
    </div>
  );
}

export function ProfileSettingsPage() {
  const { me } = useSession();
  if (!me)
    return (
      <SkeletonRegion label="Loading profile settings">
        <Skeleton variant="card" />
      </SkeletonRegion>
    );
  return <SettingsForm me={me} />;
}
