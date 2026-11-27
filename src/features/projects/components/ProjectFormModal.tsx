import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toApiDateString, type ProjectOverviewResource } from '@/shared/api';
import { Modal } from '@/shared/ui';
import { useCreateProjectMutation, useUpdateProjectMutation } from '../hooks/useProjectMutations';
import { useTeamsPickerOptions } from '../hooks/useTeamsPickerOptions';
import {
  projectCreateSchema,
  projectEditSchema,
  toCreateProjectPayload,
  toUpdateProjectPayload,
  type ProjectCreateFormValues,
  type ProjectEditFormValues,
} from '../schemas/project.schemas';
import {
  ProjectFormFooter,
  ProjectSharedFields,
  useProjectSubmitErrorHandler,
} from './ProjectFormFields';
import { ProjectMemberPicker } from './ProjectMemberPicker';

const CREATE_KNOWN_FIELDS: readonly (keyof ProjectCreateFormValues)[] = [
  'name',
  'description',
  'priority',
  'status',
  'start_date',
  'deadline',
  'teams',
  'members',
];

const EDIT_KNOWN_FIELDS: readonly (keyof ProjectEditFormValues)[] = [
  'name',
  'description',
  'priority',
  'status',
  'start_date',
  'deadline',
  'teams',
];

export type ProjectFormModalProps =
  | {
      mode: 'create';
      isOpen: boolean;
      onClose: () => void;
    }
  | {
      mode: 'edit';
      isOpen: boolean;
      onClose: () => void;
      project: ProjectOverviewResource;
    };

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateProjectMutation();
  const teamsQuery = useTeamsPickerOptions(true);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ProjectCreateFormValues>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: '',
      description: '',
      priority: 'High',
      status: 'Pending',
      start_date: '',
      deadline: '',
      teams: [],
      members: [],
    },
  });

  const handleSubmitError = useProjectSubmitErrorHandler(
    isSubmitting,
    setError,
    setFocus,
    CREATE_KNOWN_FIELDS,
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(toCreateProjectPayload(values));
      onClose();
    } catch (error) {
      handleSubmitError(error);
    }
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="New Project"
      isSubmitting={isSubmitting}
      submittingLabel="Creating..."
      size="lg"
      className="md:h-fit md:max-w-[720px]"
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <ProjectSharedFields
          register={register}
          control={control}
          errors={errors}
          isSubmitting={isSubmitting}
          teams={teamsQuery.data?.items ?? []}
          isTeamsLoading={teamsQuery.isPending}
          teamsError={teamsQuery.error}
          onRetryTeams={() => void teamsQuery.refetch()}
        />

        <Controller
          control={control}
          name="members"
          render={({ field }) => (
            <ProjectMemberPicker
              value={field.value}
              onChange={field.onChange}
              disabled={isSubmitting}
              error={errors.members?.message}
              triggerRef={field.ref}
            />
          )}
        />

        <ProjectFormFooter
          serverError={errors.root?.serverError?.message}
          isSubmitting={isSubmitting}
          submitLabel="Add Project"
          loadingText="Creating..."
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

function EditProjectModal({
  project,
  onClose,
}: {
  project: ProjectOverviewResource;
  onClose: () => void;
}) {
  const updateMutation = useUpdateProjectMutation(project.id);
  const teamsQuery = useTeamsPickerOptions(true);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ProjectEditFormValues>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? '',
      priority: project.priority,
      status: project.status,
      start_date: toApiDateString(project.due_date_indicator.start_date) ?? '',
      deadline: toApiDateString(project.due_date_indicator.deadline) ?? '',
      teams: project.teams.map((team) => team.id),
    },
  });

  const handleSubmitError = useProjectSubmitErrorHandler(
    isSubmitting,
    setError,
    setFocus,
    EDIT_KNOWN_FIELDS,
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync(toUpdateProjectPayload(values));
      onClose();
    } catch (error) {
      handleSubmitError(error);
    }
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Edit Project"
      isSubmitting={isSubmitting}
      submittingLabel="Saving..."
      size="lg"
      className="md:h-fit md:max-w-[720px]"
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <ProjectSharedFields
          register={register}
          control={control}
          errors={errors}
          isSubmitting={isSubmitting}
          teams={teamsQuery.data?.items ?? []}
          isTeamsLoading={teamsQuery.isPending}
          teamsError={teamsQuery.error}
          onRetryTeams={() => void teamsQuery.refetch()}
        />

        <ProjectFormFooter
          serverError={errors.root?.serverError?.message}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
          loadingText="Saving..."
          onClose={onClose}
        />
      </form>
    </Modal>
  );
}

/**
 * Reusable Create / Edit Project modal (`1:8650`, M8, §12.6):
 * Create supports `StoreProjectRequest` (including `/users` member picker);
 * Edit supports `UpdateProjectRequest` only (no member editing, no delete, no files dropzone).
 */
export function ProjectFormModal(props: ProjectFormModalProps) {
  if (!props.isOpen) {
    return null;
  }

  if (props.mode === 'edit') {
    return (
      <EditProjectModal
        key={`edit-${props.project.id}`}
        project={props.project}
        onClose={props.onClose}
      />
    );
  }

  return <CreateProjectModal key="create" onClose={props.onClose} />;
}
