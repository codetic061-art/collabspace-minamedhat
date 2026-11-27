import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, FolderKanban } from 'lucide-react';
import {
  Controller,
  useForm,
  type Control,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  type UseFormRegister,
} from 'react-hook-form';
import {
  applyServerValidationErrors,
  getErrorMessage,
  toApiDateString,
  toAppError,
  type ProjectOverviewResource,
  type TeamResource,
} from '@/shared/api';
import { Button, Input, Modal, Select, Textarea, useToast, type SelectOption } from '@/shared/ui';
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
import { PROJECT_PRIORITIES, PROJECT_STATUSES } from '../utils/projectPresentation';
import { ProjectMemberPicker } from './ProjectMemberPicker';
import { ProjectTeamsSelect } from './ProjectTeamsSelect';

const PRIORITY_OPTIONS: readonly SelectOption[] = PROJECT_PRIORITIES.map((priority) => ({
  value: priority,
  label: priority,
}));

const STATUS_OPTIONS: readonly SelectOption[] = PROJECT_STATUSES.map((status) => ({
  value: status,
  label: status,
}));

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

interface BaseProjectFields extends FieldValues {
  name: string;
  description: string;
  priority: (typeof PROJECT_PRIORITIES)[number];
  status: (typeof PROJECT_STATUSES)[number];
  start_date: string;
  deadline: string;
  teams: number[];
}

interface ProjectSharedFieldsProps<TFields extends BaseProjectFields> {
  register: UseFormRegister<TFields>;
  control: Control<TFields>;
  errors: FieldErrors<TFields>;
  isSubmitting: boolean;
  teams: readonly TeamResource[];
  isTeamsLoading: boolean;
  teamsError: unknown;
  onRetryTeams: () => void;
}

function ProjectSharedFields<TFields extends BaseProjectFields>({
  register,
  control,
  errors,
  isSubmitting,
  teams,
  isTeamsLoading,
  teamsError,
  onRetryTeams,
}: ProjectSharedFieldsProps<TFields>) {
  // Typed path constants stay valid for any form schema extending BaseProjectFields.
  const nameField = 'name' as FieldPath<TFields>;
  const descriptionField = 'description' as FieldPath<TFields>;
  const priorityField = 'priority' as FieldPath<TFields>;
  const statusField = 'status' as FieldPath<TFields>;
  const startDateField = 'start_date' as FieldPath<TFields>;
  const deadlineField = 'deadline' as FieldPath<TFields>;
  const teamsField = 'teams' as FieldPath<TFields>;

  return (
    <>
      <Input
        label="Project Name"
        labelVariant="notch"
        required
        placeholder="Enter project name"
        leadingIcon={<FolderKanban className="h-4 w-4" aria-hidden="true" />}
        error={typeof errors.name?.message === 'string' ? errors.name.message : undefined}
        disabled={isSubmitting}
        {...register(nameField)}
      />

      <Textarea
        label="Description"
        labelVariant="notch"
        rows={3}
        placeholder="Describe the project goals and scope"
        error={
          typeof errors.description?.message === 'string' ? errors.description.message : undefined
        }
        disabled={isSubmitting}
        {...register(descriptionField)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name={priorityField}
          render={({ field }) => (
            <Select
              label="Priority"
              labelVariant="notch"
              required
              options={PRIORITY_OPTIONS}
              value={String(field.value ?? '')}
              onChange={field.onChange}
              error={
                typeof errors.priority?.message === 'string' ? errors.priority.message : undefined
              }
              disabled={isSubmitting}
            />
          )}
        />

        <Controller
          control={control}
          name={statusField}
          render={({ field }) => (
            <Select
              label="Status"
              labelVariant="notch"
              required
              options={STATUS_OPTIONS}
              value={String(field.value ?? '')}
              onChange={field.onChange}
              error={typeof errors.status?.message === 'string' ? errors.status.message : undefined}
              disabled={isSubmitting}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Start Date"
          labelVariant="notch"
          type="date"
          required
          leadingIcon={<Calendar className="h-4 w-4" aria-hidden="true" />}
          error={
            typeof errors.start_date?.message === 'string' ? errors.start_date.message : undefined
          }
          disabled={isSubmitting}
          {...register(startDateField)}
        />

        <Input
          label="Deadline"
          labelVariant="notch"
          type="date"
          required
          leadingIcon={<Calendar className="h-4 w-4" aria-hidden="true" />}
          error={typeof errors.deadline?.message === 'string' ? errors.deadline.message : undefined}
          disabled={isSubmitting}
          {...register(deadlineField)}
        />
      </div>

      <Controller
        control={control}
        name={teamsField}
        render={({ field }) => (
          <ProjectTeamsSelect
            selectedIds={
              Array.isArray(field.value)
                ? field.value.filter((item): item is number => typeof item === 'number')
                : []
            }
            onChange={field.onChange}
            teams={teams}
            isLoading={isTeamsLoading}
            error={teamsError}
            onRetry={onRetryTeams}
            disabled={isSubmitting}
            fieldError={typeof errors.teams?.message === 'string' ? errors.teams.message : undefined}
          />
        )}
      />
    </>
  );
}

interface FormFooterProps {
  serverError: string | undefined;
  isSubmitting: boolean;
  submitLabel: string;
  loadingText: string;
  onClose: () => void;
}

function ProjectFormFooter({
  serverError,
  isSubmitting,
  submitLabel,
  loadingText,
  onClose,
}: FormFooterProps) {
  return (
    <>
      {serverError ? (
        <div
          role="alert"
          className="rounded-input border border-danger/30 bg-danger-tint px-4 py-3 text-sm text-danger"
        >
          {serverError}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText={loadingText}
          disabled={isSubmitting}
        >
          {submitLabel}
        </Button>
      </div>
    </>
  );
}

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

function CreateProjectFormBody({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast();
  const createMutation = useCreateProjectMutation();
  const teamsQuery = useTeamsPickerOptions(true);

  const {
    register,
    control,
    handleSubmit,
    setError,
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(toCreateProjectPayload(values));
      onClose();
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'forbidden') {
        const message = "You don't have permission to do this.";
        setError('root.serverError', { type: 'server', message });
        showToast({ message, tone: 'error' });
        return;
      }
      if (appError.kind !== 'validation') {
        setError('root.serverError', { type: 'server', message: getErrorMessage(appError) });
        return;
      }
      applyServerValidationErrors(error, setError, CREATE_KNOWN_FIELDS);
    }
  });

  return (
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
  );
}

function EditProjectFormBody({
  project,
  onClose,
}: {
  project: ProjectOverviewResource;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const updateMutation = useUpdateProjectMutation(project.id);
  const teamsQuery = useTeamsPickerOptions(true);

  const {
    register,
    control,
    handleSubmit,
    setError,
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync(toUpdateProjectPayload(values));
      onClose();
    } catch (error) {
      const appError = toAppError(error);
      if (appError.kind === 'forbidden') {
        const message = "You don't have permission to do this.";
        setError('root.serverError', { type: 'server', message });
        showToast({ message, tone: 'error' });
        return;
      }
      if (appError.kind !== 'validation') {
        setError('root.serverError', { type: 'server', message: getErrorMessage(appError) });
        return;
      }
      applyServerValidationErrors(error, setError, EDIT_KNOWN_FIELDS);
    }
  });

  return (
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
  );
}

/**
 * Reusable Create / Edit Project modal (`1:8650`, M8, §12.6):
 * Create supports `StoreProjectRequest` (including `/users` member picker);
 * Edit supports `UpdateProjectRequest` only (no member editing, no delete, no files dropzone).
 */
export function ProjectFormModal(props: ProjectFormModalProps) {
  const isEdit = props.mode === 'edit';

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={isEdit ? 'Edit Project' : 'New Project'}
      size="lg"
    >
      {props.isOpen ? (
        props.mode === 'edit' ? (
          <EditProjectFormBody
            key={`edit-${props.project.id}`}
            project={props.project}
            onClose={props.onClose}
          />
        ) : (
          <CreateProjectFormBody key="create" onClose={props.onClose} />
        )
      ) : null}
    </Modal>
  );
}
