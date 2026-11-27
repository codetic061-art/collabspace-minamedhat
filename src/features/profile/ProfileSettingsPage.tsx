import { Link } from 'react-router';
import { useSession } from '@/features/auth';
import type { ProfileMeData } from '@/shared/api';
import { toSafeExternalUrl } from '@/shared/lib';
import { Avatar, Button, Card, Field, Input, Skeleton, SkeletonRegion } from '@/shared/ui';
import { PasswordCard } from './PasswordCard';
import { useProfileSettings } from './useProfileSettings';

const selectClass =
  'min-h-touch w-full rounded-pill border border-profile-border bg-surface px-4 text-sm';

function SettingsForm({ me }: { me: ProfileMeData }) {
  const {
    user,
    projects,
    avatarError,
    validatingAvatar,
    avatarInput,
    removing,
    register,
    errors,
    isSubmitting,
    submit,
    remove,
    selectAvatar,
  } = useProfileSettings(me);
  return (
    <div className="space-y-10 lg:pt-12">
      <div className="flex items-center gap-5">
        <Avatar name={user.name} src={toSafeExternalUrl(user.avatar_url)} size="xl" />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold">Profile settings</h1>
          <Link to="/profile" className="text-sm text-primary">
            Back to profile
          </Link>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="space-y-10">
        <section className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
          <div>
            <h2 className="text-xl font-semibold">Personal Info</h2>
            <p className="mt-2 text-sm text-body">
              You can change your personal information settings here.
            </p>
          </div>
          <Card variant="settings" className="min-w-0 space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                  ref={avatarInput}
                  className="w-full min-w-0 max-w-full"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isSubmitting || removing}
                  onChange={(event) => selectAvatar(event.target.files?.[0])}
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
        <section className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
          <div>
            <h2 className="text-xl font-semibold">Experience</h2>
            <p className="mt-2 text-sm text-body">You can change your experience settings here.</p>
          </div>
          <Card variant="settings" className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
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
