import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Paperclip } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useSession } from '@/features/auth';
import {
  getErrorMessage,
  formatDisplayDate,
  KANBAN_STATUS_ORDER,
  projectsQueries,
  tasksQueries,
  toAppError,
  type TaskResource,
  type TaskStatus,
} from '@/shared/api';
import { hasCapability, toSafeExternalUrl } from '@/shared/lib';
import { Avatar, Badge, BlockErrorState, Button, Skeleton, SkeletonRegion } from '@/shared/ui';
import { normalizeDashboardPriority } from '@/features/dashboard';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import { TaskFormModal } from '../components/TaskFormModal';
import { useTaskStatus } from '../hooks/useTaskStatus';

const tints: Record<TaskStatus, string> = {
  Pending: 'bg-surface-input',
  'In Progress': 'bg-primary-tint',
  'In Review': 'bg-pink-tint',
  Completed: 'bg-success-tint',
};
const dots: Record<TaskStatus, string> = {
  Pending: 'bg-body',
  'In Progress': 'bg-primary',
  'In Review': 'bg-pink',
  Completed: 'bg-success',
};

export function TaskBoard({ projectId }: { projectId: number }) {
  const { role, user } = useSession();
  const board = useQuery(tasksQueries.board(projectId));
  const teams = useQuery(projectsQueries.teams(projectId));
  const [params, setParams] = useSearchParams();
  const rawTaskId = params.get('taskId');
  const taskId = rawTaskId && /^\d+$/.test(rawTaskId) ? Number(rawTaskId) : null;
  const [search, setSearch] = useState('');
  const [mine, setMine] = useState(false);
  const [team, setTeam] = useState('');
  const [form, setForm] = useState<{ status: TaskStatus; task: TaskResource | null } | null>(null);
  const statusMutation = useTaskStatus(projectId);
  const [focusTask, setFocusTask] = useState<number | null>(null);
  const selects = useRef(new Map<number, HTMLSelectElement>());
  useEffect(() => {
    if (focusTask === null || taskId !== null || form || statusMutation.pendingIds.has(focusTask))
      return;
    const select = selects.current.get(focusTask);
    if (select && !select.disabled) {
      select.focus();
      setFocusTask(null);
    }
  }, [focusTask, statusMutation.pendingIds, board.data, taskId, form]);
  const openTask = (id: number | null) => {
    const next = new URLSearchParams(params);
    if (id === null) next.delete('taskId');
    else next.set('taskId', String(id));
    setParams(next);
  };
  if (board.isPending)
    return (
      <SkeletonRegion label="Loading tasks" className="grid grid-cols-4 gap-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </SkeletonRegion>
    );
  if (board.error) {
    const error = toAppError(board.error);
    if (error.kind === 'unauthorized') return null;
    return (
      <BlockErrorState message={getErrorMessage(error)} onRetry={() => void board.refetch()} />
    );
  }
  const canCreate = hasCapability(role, 'create_task');
  return (
    <section className="space-y-5" aria-label="Task board">
      <div className="flex flex-wrap items-center gap-4">
        <label className="w-full md:w-[326px]">
          <span className="sr-only">Search tasks</span>
          <input
            className="h-10 w-full rounded-pill border border-border-subtle bg-surface px-4 py-2 text-sm"
            type="search"
            placeholder="Search"
            aria-label="Search tasks"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Task assignment filter</span>
          <select
            className="h-10 rounded-[16px] border border-ink bg-surface px-4 py-2 text-sm"
            value={mine ? 'mine' : 'all'}
            onChange={(event) => setMine(event.target.value === 'mine')}
          >
            <option value="all">All tasks</option>
            <option value="mine">My tasks</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Team filter</span>
          <select
            className="h-10 rounded-[16px] border border-ink bg-surface px-4 py-2 text-sm"
            value={team}
            onChange={(event) => setTeam(event.target.value)}
          >
            <option value="">All teams</option>
            {teams.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {canCreate && (
          <Button className="ml-auto" onClick={() => setForm({ status: 'Pending', task: null })}>
            Create Task +
          </Button>
        )}
      </div>
      {teams.error && (
        <p role="alert">
          Teams could not be loaded.{' '}
          <button type="button" onClick={() => void teams.refetch()}>
            Retry
          </button>
        </p>
      )}
      {statusMutation.failure && (
        <p role="alert" className="text-danger">
          {statusMutation.failure.message}
        </p>
      )}
      <div className="flex snap-x gap-8 overflow-x-auto pb-4">
        {KANBAN_STATUS_ORDER.map((status) => {
          const tasks = board.data.columns[status].tasks.filter(
            (task) =>
              (!mine || task.assigned_to === user?.id) &&
              (!team || task.team_id === Number(team)) &&
              `${task.name} ${task.description ?? ''}`.toLowerCase().includes(search.toLowerCase()),
          );
          return (
            <section
              key={status}
              className="min-w-[304px] flex-1 snap-start overflow-hidden rounded-card border border-border-subtle bg-surface"
            >
              <h2 className={`flex items-center gap-2 p-5 text-xs font-semibold ${tints[status]}`}>
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dots[status]}`} />
                {status} <span className="font-normal">({tasks.length})</span>
              </h2>
              <div className="space-y-4 p-5">
                {canCreate && (
                  <Button
                    variant="dashed"
                    fullWidth
                    onClick={() => setForm({ status, task: null })}
                  >
                    Add Task +
                  </Button>
                )}
                {tasks.length === 0 && <p className="text-sm text-body">No tasks</p>}
                {tasks.map((task) => (
                  <article
                    key={task.id}
                    className="space-y-3 rounded-card bg-surface-input p-4 text-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <button
                        type="button"
                        className="text-left font-semibold text-ink hover:underline"
                        onClick={() => openTask(task.id)}
                      >
                        {task.name}
                      </button>
                      <Badge
                        variant={normalizeDashboardPriority(task.priority.toLowerCase()).variant}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="line-clamp-2 text-body">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {task.assignee && (
                        <>
                          <Avatar
                            name={task.assignee.name}
                            src={toSafeExternalUrl(task.assignee.avatar_url)}
                            size="xs"
                          />
                          <span>{task.assignee.name}</span>
                        </>
                      )}
                      {task.attachments_count > 0 && (
                        <span className="ml-auto flex items-center gap-1">
                          <Paperclip size={14} />
                          {task.attachments_count}
                        </span>
                      )}
                    </div>
                    {task.due_date && (
                      <p className="flex items-center gap-1">
                        <CalendarDays size={14} aria-hidden="true" />
                        {formatDisplayDate(task.due_date)}
                      </p>
                    )}
                    <label className="block">
                      Status
                      <select
                        aria-label={`Status for ${task.name}`}
                        ref={(node) => {
                          if (node) selects.current.set(task.id, node);
                          else selects.current.delete(task.id);
                        }}
                        className="mt-1 w-full rounded-input border border-border-card bg-surface p-2"
                        value={task.status}
                        disabled={
                          !hasCapability(role, 'change_task_status') ||
                          statusMutation.pendingIds.has(task.id)
                        }
                        onChange={(event) => {
                          const value = KANBAN_STATUS_ORDER.find(
                            (item) => item === event.target.value,
                          );
                          if (value) {
                            setFocusTask(task.id);
                            statusMutation.changeStatus(task, value);
                          }
                        }}
                      >
                        {KANBAN_STATUS_ORDER.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {taskId !== null && (
        <TaskDetailsModal
          taskId={taskId}
          projectId={projectId}
          onClose={() => openTask(null)}
          onEdit={(task) => {
            openTask(null);
            setForm({ task, status: task.status });
          }}
          onStatus={statusMutation.changeStatus}
          isStatusPending={statusMutation.pendingIds.has(taskId)}
          statusMessage={
            statusMutation.failure?.taskId === taskId ? statusMutation.failure.message : ''
          }
        />
      )}
      {form && (
        <TaskFormModal
          projectId={projectId}
          initialStatus={form.status}
          task={form.task}
          onClose={() => setForm(null)}
        />
      )}
    </section>
  );
}
