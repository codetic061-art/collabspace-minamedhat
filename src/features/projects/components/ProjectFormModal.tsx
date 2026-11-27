import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, FolderKanban } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import {
  Controller,
  useForm,
  type Control,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  type UseFormRegister,
  type UseFormSetError,
  type UseFormSetFocus,
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

function getFieldError(fieldError: unknown): string | undefined {
  if (
    typeof fieldError === 'object' &&
    fieldError !== null &&
    'message' in fieldError &&
    typeof fieldError.message === 'string'
  ) {
    return fieldError.message;
  }
  return undefined;
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
        error={getFieldError(errors.name)}
        disabled={isSubmitting}
        {...register(nameField)}
      />

      <Textarea
        label="Description"
        labelVariant="notch"
        rows={3}
        placeholder="Describe the project goals and scope"
        error={getFieldError(errors.description)}
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
              error={getFieldError(errors.priority)}
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
              error={getFieldError(errors.status)}
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
          error={getFieldError(errors.start_date)}
          disabled={isSubmitting}
          {...register(startDateField)}
        />

        <Input
          label="Deadline"
          labelVariant="notch"
          type="date"
          required
          leadingIcon={<Calendar className="h-4 w-4" aria-hidden="true" />}
          error={getFieldError(errors.deadline)}
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
                ? field.value.filter((item: unknown): item is number => typeof item === 'number')
                : []
            }
            onChange={field.onChange}
            teams={teams}
            isLoading={isTeamsLoading}
            error={teamsError}
            onRetry={onRetryTeams}
            disabled={isSubmitting}
            fieldError={getFieldError(errors.teams)}
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

function findFirstValidationField<TFieldValues extends FieldValues>(
  error: unknown,
  knownFields: readonly FieldPath<TFieldValues>[],
): FieldPath<TFieldValues> | null {
  const appError = toAppError(error);
  if (appError.kind !== 'validation') {
    return null;
  }

  for (const rawField of Object.keys(appError.errors)) {
    const matched = knownFields.find((field) => String(field) === rawField);
    if (matched) {
      return matched;
    }
  }

  return null;
}

function useProjectSubmitErrorHandler<TFieldValues extends FieldValues>(
  isSubmitting: boolean,
  setError: UseFormSetError<TFieldValues>,
  setFocus: UseFormSetFocus<TFieldValues>,
  knownFields: readonly FieldPath<TFieldValues>[],
) {
  const { showToast } = useToast();
  const pendingFocusRef = useRef<FieldPath<TFieldValues> | null>(null);

  useEffect(() => {
    if (!isSubmitting && pendingFocusRef.current) {
      setFocus(pendingFocusRef.current);
      pendingFocusRef.current = null;
    }
  }, [isSubmitting, setFocus]);

  return useCallback(
    (error: unknown) => {
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

      pendingFocusRef.current = findFirstValidationField(error, knownFields);
      applyServerValidationErrors(error, setError, knownFields);
    },
    [knownFields, setError, showToast],
  );
}

function CreateProjectFormBody({ onClose }: { onClose: () => void }) {
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
