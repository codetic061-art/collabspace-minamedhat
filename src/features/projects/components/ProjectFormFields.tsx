import { Calendar, FolderKanban } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import {
  Controller,
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
  toAppError,
  type TeamResource,
} from '@/shared/api';
import { Button, Input, Select, Textarea, useToast, type SelectOption } from '@/shared/ui';
import { PROJECT_PRIORITIES, PROJECT_STATUSES } from '../utils/projectPresentation';
import { ProjectTeamsSelect } from './ProjectTeamsSelect';

const PRIORITY_OPTIONS: readonly SelectOption[] = PROJECT_PRIORITIES.map((priority) => ({
  value: priority,
  label: priority,
}));

const STATUS_OPTIONS: readonly SelectOption[] = PROJECT_STATUSES.map((status) => ({
  value: status,
  label: status,
}));

export interface BaseProjectFields extends FieldValues {
  name: string;
  description: string;
  priority: (typeof PROJECT_PRIORITIES)[number];
  status: (typeof PROJECT_STATUSES)[number];
  start_date: string;
  deadline: string;
  teams: number[];
}

export interface ProjectSharedFieldsProps<TFields extends BaseProjectFields> {
  register: UseFormRegister<TFields>;
  control: Control<TFields>;
  errors: FieldErrors<TFields>;
  isSubmitting: boolean;
  teams: readonly TeamResource[];
  isTeamsLoading: boolean;
  teamsError: unknown;
  onRetryTeams: () => void;
}

export function getFieldError(fieldError: unknown): string | undefined {
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

/**
 * Shared submit-error handler for Create/Edit project forms: maps `403`, generic failures,
 * and `422` validation fields while scheduling focus after `isSubmitting` clears.
 */
export function useProjectSubmitErrorHandler<TFieldValues extends FieldValues>(
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

/** Shared Create/Edit project form inputs covering verified `Store`/`Update` request fields. */
export function ProjectSharedFields<TFields extends BaseProjectFields>(
  props: ProjectSharedFieldsProps<TFields>,
) {
  const {
    register,
    control,
    errors,
    isSubmitting,
    teams,
    isTeamsLoading,
    teamsError,
    onRetryTeams,
  } = props;

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
            triggerRef={field.ref}
          />
        )}
      />
    </>
  );
}

export interface ProjectFormFooterProps {
  serverError: string | undefined;
  isSubmitting: boolean;
  submitLabel: string;
  loadingText: string;
  onClose: () => void;
}

export function ProjectFormFooter(props: ProjectFormFooterProps) {
  const { serverError, isSubmitting, submitLabel, loadingText, onClose } = props;

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
