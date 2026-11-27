import { useRef, useState, type FormEventHandler } from 'react';
import { useForm } from 'react-hook-form';
import { useSession } from '@/features/auth';
import {
  applyServerValidationErrors,
  getErrorMessage,
  profileService,
  toAppError,
  type AvailabilityStatus,
  type ProfileMeData,
} from '@/shared/api';
import { useToast } from '@/shared/ui';

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

export function useProfileSettings(me: ProfileMeData) {
  const { refreshMe } = useSession();
  const { showToast } = useToast();
  const { user, projects } = me;
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState('');
  const [validatingAvatar, setValidatingAvatar] = useState(false);
  const avatarSelection = useRef(0);
  const avatarInput = useRef<HTMLInputElement>(null);
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
  const submit: FormEventHandler<HTMLFormElement> = (event) => void handleSubmit(async (values) => {
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
      setAvatar(null);
      if (avatarInput.current) avatarInput.current.value = '';
      showToast({ message: 'Profile updated.', tone: 'success' });
      void refreshMe();
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'validation' && appError.errors.avatar?.[0]) {
        setAvatarError(appError.errors.avatar[0]);
      }
      applyServerValidationErrors(error, setError, settingsFields);
    }
  })(event);
  async function remove() {
    if (removing) return;
    setRemoving(true);
    setAvatarError('');
    try {
      await profileService.removeAvatar();
      setAvatar(null);
      avatarSelection.current += 1;
      if (avatarInput.current) avatarInput.current.value = '';
      showToast({ message: 'Avatar removed.', tone: 'success' });
      void refreshMe();
    } catch (error) {
      setAvatarError(getErrorMessage(toAppError(error)));
    } finally {
      setRemoving(false);
    }
  }
  function selectAvatar(file: File | undefined) {
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
  }
  return {
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
  };
}
