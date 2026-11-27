import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { useSession } from '@/features/auth';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  getErrorMessage,
  KANBAN_STATUS_ORDER,
  projectsKeys,
  projectsQueries,
  tasksKeys,
  tasksQueries,
  tasksService,
  toAppError,
  type TaskResource,
  type TaskStatus,
} from '@/shared/api';
import { hasCapability, toSafeExternalUrl } from '@/shared/lib';
import {
  Avatar,
  BlockErrorState,
  Button,
  ConfirmDialog,
  Modal,
  NativeSelect,
  Skeleton,
} from '@/shared/ui';

const statusOptions = KANBAN_STATUS_ORDER.map((value) => ({ value, label: value }));

function AssigneeControl({ task }: { task: TaskResource }) {
  const client = useQueryClient();
  const overview = useQuery(projectsQueries.overview(task.project_id));
  const teams = useQuery(projectsQueries.teams(task.project_id));
  const assign = useMutation({
    mutationFn: (assignedTo: number | null) =>
      tasksService.assignTask(task.id, { assigned_to: assignedTo }),
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
  const members = new Map<number, string>();
  for (const member of overview.data?.direct_members ?? []) members.set(member.id, member.name);
  for (const team of teams.data ?? []) {
    for (const member of team.members) members.set(member.id, member.name);
  }
  if (task.assignee && !members.has(task.assignee.id))
    members.set(task.assignee.id, task.assignee.name);
  const error = overview.error ?? teams.error;
  return (
    <div className="space-y-2">
      <NativeSelect
        label="Reassign"
        value={task.assigned_to ? String(task.assigned_to) : ''}
        disabled={assign.isPending || overview.isPending || teams.isPending || Boolean(error)}
        options={[
          { value: '', label: 'Unassigned' },
          ...Array.from(members, ([id, name]) => ({ value: String(id), label: name })),
        ]}
        onChange={(event) => assign.mutate(event.target.value ? Number(event.target.value) : null)}
      />
      {error ? (
        <p role="alert">
          Unable to load project members.{' '}
          <Button
            variant="link"
            onClick={() => {
              void overview.refetch();
              void teams.refetch();
            }}
          >
            Retry
          </Button>
        </p>
      ) : null}
      {assign.error ? (
        <p role="alert" className="text-danger">
          {getErrorMessage(toAppError(assign.error))}
        </p>
      ) : null}
    </div>
  );
}

export function TaskDetailsModal({
  taskId,
  onClose,
  onEdit,
  onStatus,
  isStatusPending,
}: {
  taskId: number;
  projectId: number;
  onClose: () => void;
  onEdit: (task: TaskResource) => void;
  onStatus: (task: TaskResource, status: TaskStatus) => void;
  isStatusPending: boolean;
}) {
  const { role } = useSession();
  const client = useQueryClient();
  const query = useQuery(tasksQueries.detail(taskId));
  const [confirming, setConfirming] = useState(false);
  const deletion = useMutation({
    mutationFn: () => tasksService.deleteTask(taskId),
    onError: () => setConfirming(false),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: tasksKeys.all }),
        client.invalidateQueries({ queryKey: projectsKeys.all }),
      ]);
      onClose();
    },
  });
  const task = query.data;
  const error = query.error ? toAppError(query.error) : null;
  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={task?.name ?? 'Task Details'}
        size="lg"
        className="md:h-fit md:max-w-[720px]"
      >
        {query.isPending ? <Skeleton variant="card" /> : null}
        {error && error.kind !== 'unauthorized' ? (
          <BlockErrorState message={getErrorMessage(error)} onRetry={() => void query.refetch()} />
        ) : null}
        {task ? (
          <div className="space-y-5">
            <div className="flex gap-3 text-sm">
              <span>{task.priority}</span>
              <span>{task.status}</span>
            </div>
            <p>{task.description || 'No description'}</p>
            {hasCapability(role, 'change_task_status') ? (
              <NativeSelect
                label="Status"
                options={statusOptions}
                value={task.status}
                disabled={isStatusPending}
                onChange={(event) => {
                  const next = KANBAN_STATUS_ORDER.find((status) => status === event.target.value);
                  if (next) onStatus(task, next);
                }}
              />
            ) : null}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium">Project</dt>
                <dd>
                  <Link className="text-primary underline" to={`/projects/${task.project_id}`}>
                    {task.project?.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="font-medium">Team</dt>
                <dd>{task.team?.name ?? 'None'}</dd>
              </div>
              <div>
                <dt className="font-medium">Assignee</dt>
                <dd className="flex items-center gap-2">
                  {task.assignee ? (
                    <>
                      <Avatar
                        name={task.assignee.name}
                        src={toSafeExternalUrl(task.assignee.avatar_url)}
                        size="xs"
                      />
                      {task.assignee.name}
                      {task.assignee.job_title ? ` · ${task.assignee.job_title}` : ''}
                    </>
                  ) : (
                    'Unassigned'
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Due date</dt>
                <dd>{formatDisplayDate(task.due_date) || 'No due date'}</dd>
              </div>
              {task.completed_at ? (
                <div>
                  <dt className="font-medium">Completed at</dt>
                  <dd>{formatDisplayDateTime(task.completed_at)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium">Hours spent</dt>
                <dd>{task.hours_spent}</dd>
              </div>
              <div>
                <dt className="font-medium">Created by</dt>
                <dd>
                  {task.creator.name} · {formatDisplayDateTime(task.created_at)}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Last updated</dt>
                <dd>{formatDisplayDateTime(task.updated_at)}</dd>
              </div>
              <div>
                <dt className="font-medium">Attachments</dt>
                <dd>{task.attachments_count}</dd>
              </div>
            </dl>
            {hasCapability(role, 'assign_task') ? <AssigneeControl task={task} /> : null}
            {deletion.error ? (
              <p role="alert" className="text-danger">
                {getErrorMessage(toAppError(deletion.error))}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {hasCapability(role, 'edit_task') ? (
                <Button onClick={() => onEdit(task)}>Edit</Button>
              ) : null}
              {hasCapability(role, 'delete_task') ? (
                <Button variant="danger" onClick={() => setConfirming(true)}>
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => deletion.mutate()}
        title="Delete task?"
        description={`This permanently deletes “${task?.name ?? 'this task'}”.`}
        isConfirming={deletion.isPending}
      />
    </>
  );
}
