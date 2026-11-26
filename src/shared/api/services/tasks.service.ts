import { queryOptions } from '@tanstack/react-query';
import { requestAction, requestJson, type ApiMessageResult } from '../httpClient';
import { normalizeP1, type P1Collection, type PaginatedResult } from '../pagination';
import type { TaskPriority, TaskResource, TaskStatus } from '../types';

export const KANBAN_STATUS_ORDER: readonly TaskStatus[] = [
  'Pending',
  'In Progress',
  'In Review',
  'Completed',
];

export interface ListTasksParams {
  project_id?: number;
  page?: number;
  per_page?: number;
  status?: TaskStatus | null;
  priority?: TaskPriority | null;
  assigned_to?: number | null;
  due_date?: string | null;
  overdue?: 0 | 1 | boolean | null;
}

export interface KanbanColumn {
  name: TaskStatus;
  count: number;
  tasks: TaskResource[];
}

export interface KanbanBoardData {
  project: {
    id: number;
    name: string;
    progress_percentage: number;
  };
  total_tasks: number;
  columns: Record<TaskStatus, KanbanColumn>;
}

export interface CreateTaskPayload {
  name: string;
  description?: string | null;
  project_id: number;
  team_id?: number | null;
  assigned_to?: number | null;
  priority?: TaskPriority | null;
  status?: TaskStatus | null;
  due_date?: string | null;
  hours_spent?: number | null;
}

export interface UpdateTaskPayload {
  name?: string;
  description?: string | null;
  project_id?: number;
  team_id?: number | null;
  assigned_to?: number | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string | null;
  hours_spent?: number | null;
}

export interface UpdateTaskStatusPayload {
  status: TaskStatus;
  hours_spent?: number | null;
}

export interface AssignTaskPayload {
  assigned_to?: number | null;
  team_id?: number | null;
}

const TASKS_PATHS = {
  list: '/tasks',
  kanban: (projectId: number) => `/projects/${projectId}/tasks/kanban`,
  create: '/tasks',
  detail: (taskId: number) => `/tasks/${taskId}`,
  updateStatus: (taskId: number) => `/tasks/${taskId}/status`,
  assign: (taskId: number) => `/tasks/${taskId}/assign`,
} as const;

export const tasksKeys = {
  all: ['tasks'] as const,
  list: (params: ListTasksParams = {}): readonly ['tasks', 'list', ListTasksParams] => [
    'tasks',
    'list',
    params,
  ],
  board: (projectId: number): readonly ['tasks', 'board', number] => ['tasks', 'board', projectId],
  detail: (taskId: number): readonly ['tasks', 'detail', number] => ['tasks', 'detail', taskId],
};

/** Lists paginated tasks (`GET /tasks`, P1 collection). */
export async function listTasks(
  params: ListTasksParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<TaskResource>> {
  const collection = await requestJson<P1Collection<TaskResource>>(TASKS_PATHS.list, {
    query: {
      project_id: params.project_id,
      page: params.page,
      per_page: params.per_page,
      status: params.status,
      priority: params.priority,
      assigned_to: params.assigned_to,
      due_date: params.due_date,
      overdue: params.overdue,
    },
    signal,
  });
  return normalizeP1(collection);
}

/** Fetches the 4-column Kanban board for a project (`GET /projects/{project}/tasks/kanban`). */
export function getProjectKanban(
  projectId: number,
  signal?: AbortSignal,
): Promise<KanbanBoardData> {
  return requestJson<KanbanBoardData>(TASKS_PATHS.kanban(projectId), { signal });
}

/** Creates a new task (`POST /tasks`, 201 Created). */
export function createTask(payload: CreateTaskPayload): Promise<TaskResource> {
  return requestJson<TaskResource>(TASKS_PATHS.create, {
    method: 'POST',
    body: payload,
  });
}

/** Fetches task details (`GET /tasks/{task}`). */
export function getTask(taskId: number, signal?: AbortSignal): Promise<TaskResource> {
  return requestJson<TaskResource>(TASKS_PATHS.detail(taskId), { signal });
}

/** Updates task fields (`PUT /tasks/{task}`). */
export function updateTask(taskId: number, payload: UpdateTaskPayload): Promise<TaskResource> {
  return requestJson<TaskResource>(TASKS_PATHS.detail(taskId), {
    method: 'PUT',
    body: payload,
  });
}

/** Moves a task to a new Kanban status (`PATCH /tasks/{task}/status`). */
export function updateTaskStatus(
  taskId: number,
  payload: UpdateTaskStatusPayload,
): Promise<TaskResource> {
  return requestJson<TaskResource>(TASKS_PATHS.updateStatus(taskId), {
    method: 'PATCH',
    body: payload,
  });
}

/** Assigns or unassigns a task (`PATCH /tasks/{task}/assign`). */
export function assignTask(taskId: number, payload: AssignTaskPayload): Promise<TaskResource> {
  return requestJson<TaskResource>(TASKS_PATHS.assign(taskId), {
    method: 'PATCH',
    body: payload,
  });
}

/** Deletes a task (`DELETE /tasks/{task}`, E3). */
export function deleteTask(taskId: number): Promise<ApiMessageResult> {
  return requestAction(TASKS_PATHS.detail(taskId), {
    method: 'DELETE',
  });
}

/**
 * Pure cache transform moving a task between exact Title-case Kanban columns (`ADR-05`).
 * Used by optimistic `PATCH /tasks/{id}/status` mutations with snapshot rollback on error.
 */
export function moveKanbanTaskOptimistically(
  board: KanbanBoardData,
  taskId: number,
  targetStatus: TaskStatus,
): KanbanBoardData {
  let sourceStatus: TaskStatus | null = null;
  let movedTask: TaskResource | null = null;

  for (const status of KANBAN_STATUS_ORDER) {
    const match = board.columns[status].tasks.find((task) => task.id === taskId);
    if (match) {
      sourceStatus = status;
      movedTask = match;
      break;
    }
  }

  if (!sourceStatus || !movedTask || sourceStatus === targetStatus) {
    return board;
  }

  const nextSourceTasks = board.columns[sourceStatus].tasks.filter((task) => task.id !== taskId);
  const updatedTask: TaskResource = {
    ...movedTask,
    status: targetStatus,
  };
  const nextTargetTasks = [updatedTask, ...board.columns[targetStatus].tasks];

  return {
    ...board,
    columns: {
      ...board.columns,
      [sourceStatus]: {
        ...board.columns[sourceStatus],
        count: nextSourceTasks.length,
        tasks: nextSourceTasks,
      },
      [targetStatus]: {
        ...board.columns[targetStatus],
        count: nextTargetTasks.length,
        tasks: nextTargetTasks,
      },
    },
  };
}

export const tasksQueries = {
  list: (params: ListTasksParams = {}) =>
    queryOptions({
      queryKey: tasksKeys.list(params),
      queryFn: ({ signal }) => listTasks(params, signal),
    }),
  board: (projectId: number) =>
    queryOptions({
      queryKey: tasksKeys.board(projectId),
      queryFn: ({ signal }) => getProjectKanban(projectId, signal),
    }),
  detail: (taskId: number) =>
    queryOptions({
      queryKey: tasksKeys.detail(taskId),
      queryFn: ({ signal }) => getTask(taskId, signal),
    }),
};
