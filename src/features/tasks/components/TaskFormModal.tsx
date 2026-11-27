import '@/shared/config/zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  applyServerValidationErrors,
  projectsKeys,
  projectsQueries,
  tasksKeys,
  tasksService,
  toApiDateString,
  type TaskResource,
  type TaskStatus,
} from '@/shared/api';
import { Button, Input, Modal, NativeSelect, Textarea } from '@/shared/ui';

const schema = z.object({
  name: z.string().trim().min(1, 'Task name is required.').max(255),
  description: z.string(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['Pending', 'In Progress', 'In Review', 'Completed']),
  due_date: z.string(),
  assigned_to: z.string(),
});
type Values = z.infer<typeof schema>;
const fields: readonly (keyof Values)[] = [
  'name',
  'description',
  'priority',
  'status',
  'due_date',
  'assigned_to',
];
const priorities = ['Low', 'Medium', 'High', 'Critical'].map((value) => ({ value, label: value }));
const statuses = ['Pending', 'In Progress', 'In Review', 'Completed'].map((value) => ({
  value,
  label: value,
}));

export function TaskFormModal({
  projectId,
  initialStatus,
  task,
  onClose,
}: {
  projectId: number;
  initialStatus: TaskStatus;
  task: TaskResource | null;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const overview = useQuery(projectsQueries.overview(projectId));
  const teams = useQuery(projectsQueries.teams(projectId));
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: task?.name ?? '',
      description: task?.description ?? '',
      priority: task?.priority ?? 'Medium',
      status: task?.status ?? initialStatus,
      due_date: toApiDateString(task?.due_date) ?? '',
      assigned_to: task?.assigned_to ? String(task.assigned_to) : '',
    },
  });
  const members = new Map<number, string>();
  for (const member of overview.data?.direct_members ?? []) members.set(member.id, member.name);
  for (const team of teams.data ?? []) {
    for (const member of team.members) members.set(member.id, member.name);
  }
  if (task?.assignee && !members.has(task.assignee.id))
    members.set(task.assignee.id, task.assignee.name);
  const memberOptions = [
    { value: '', label: 'Unassigned' },
    ...Array.from(members, ([id, name]) => ({ value: String(id), label: name })),
  ];

  const onSubmit = handleSubmit(async (values) => {
    const assignee = values.assigned_to ? Number(values.assigned_to) : null;
    try {
      const payload = {
        name: values.name,
        description: values.description || null,
        priority: values.priority,
        status: values.status,
        due_date: values.due_date || null,
      };
      if (task) {
        await tasksService.updateTask(task.id, payload);
        if (assignee !== task.assigned_to)
          await tasksService.assignTask(task.id, { assigned_to: assignee });
      } else {
        await tasksService.createTask({ ...payload, project_id: projectId, assigned_to: assignee });
      }
      onClose();
    } catch (error) {
      applyServerValidationErrors(error, setError, fields);
    } finally {
      await Promise.all([
        client.invalidateQueries({ queryKey: tasksKeys.all }),
        client.invalidateQueries({ queryKey: projectsKeys.all }),
      ]);
    }
  });
  const pickerError = overview.error ?? teams.error;
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={task ? 'Edit Task' : 'Create Task'}
      size="lg"
      isSubmitting={isSubmitting}
      className="md:h-fit md:max-w-[720px]"
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Task Name"
          required
          error={errors.name?.message}
          disabled={isSubmitting}
          {...register('name')}
        />
        <Textarea
          label="Description"
          labelVariant="notch"
          error={errors.description?.message}
          disabled={isSubmitting}
          {...register('description')}
        />
        <Input
          label="Project"
          value={overview.data?.name ?? task?.project.name ?? `Project ${projectId}`}
          readOnly
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <NativeSelect
            label="Priority"
            labelVariant="notch"
            options={priorities}
            error={errors.priority?.message}
            disabled={isSubmitting}
            {...register('priority')}
          />
          <NativeSelect
            label="Status"
            labelVariant="notch"
            options={statuses}
            error={errors.status?.message}
            disabled={isSubmitting}
            {...register('status')}
          />
        </div>
        <Input
          label="Due Date"
          type="date"
          error={errors.due_date?.message}
          disabled={isSubmitting}
          {...register('due_date')}
        />
        <NativeSelect
          label="Assignee"
          labelVariant="notch"
          options={memberOptions}
          error={errors.assigned_to?.message}
          disabled={isSubmitting || overview.isPending || teams.isPending || Boolean(pickerError)}
          {...register('assigned_to')}
        />
        {overview.isPending || teams.isPending ? (
          <p role="status">Loading project members...</p>
        ) : null}
        {pickerError ? (
          <div role="alert" className="text-sm text-danger">
            Could not load project members.{' '}
            <Button
              variant="link"
              onClick={() => {
                void overview.refetch();
                void teams.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {errors.root?.serverError?.message ? (
          <p role="alert" className="text-sm text-danger">
            {errors.root.serverError.message}
          </p>
        ) : null}
        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          loadingText="Saving..."
          disabled={Boolean(pickerError) || overview.isPending || teams.isPending}
        >
          {task ? 'Save Changes' : 'Create Task'}
        </Button>
      </form>
    </Modal>
  );
}
