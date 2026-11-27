import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import {
  getErrorMessage,
  moveKanbanTaskOptimistically,
  projectsKeys,
  tasksKeys,
  tasksService,
  toAppError,
  type KanbanBoardData,
  type TaskResource,
  type TaskStatus,
} from '@/shared/api';

export function useTaskStatus(projectId: number) {
  const client = useQueryClient();
  const [failure, setFailure] = useState<{ taskId: number; message: string } | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set());
  const pendingRef = useRef(new Set<number>());
  const mutationKey = [...tasksKeys.all, 'status-change', projectId];
  const mutation = useMutation({
    mutationKey,
    mutationFn: ({ task, status }: { task: TaskResource; status: TaskStatus }) =>
      tasksService.updateTaskStatus(task.id, { status }),
    onMutate: async ({ task, status }) => {
      setFailure(null);
      pendingRef.current.add(task.id);
      setPendingIds((ids) => new Set(ids).add(task.id));
      await client.cancelQueries({ queryKey: tasksKeys.board(projectId) });
      await client.cancelQueries({ queryKey: tasksKeys.detail(task.id) });
      const previous = client.getQueryData<KanbanBoardData>(tasksKeys.board(projectId));
      const previousDetail = client.getQueryData<TaskResource>(tasksKeys.detail(task.id));
      if (previous)
        client.setQueryData(
          tasksKeys.board(projectId),
          moveKanbanTaskOptimistically(previous, task.id, status),
        );
      if (previousDetail)
        client.setQueryData(tasksKeys.detail(task.id), { ...previousDetail, status });
      return { previousDetail };
    },
    onError: (error, variables, context) => {
      client.setQueryData<KanbanBoardData>(tasksKeys.board(projectId), (current) =>
        current
          ? moveKanbanTaskOptimistically(current, variables.task.id, variables.task.status)
          : current,
      );
      if (context?.previousDetail)
        client.setQueryData(tasksKeys.detail(variables.task.id), context.previousDetail);
      setFailure({ taskId: variables.task.id, message: getErrorMessage(toAppError(error)) });
    },
    onSettled: async (_data, _error, variables) => {
      pendingRef.current.delete(variables.task.id);
      await Promise.all([
        pendingRef.current.size === 0
          ? client.invalidateQueries({ queryKey: tasksKeys.all })
          : Promise.resolve(),
        client.invalidateQueries({ queryKey: projectsKeys.detail(projectId) }),
        client.invalidateQueries({ queryKey: [...projectsKeys.all, 'overview', projectId] }),
      ]);
      setPendingIds((ids) => {
        const next = new Set(ids);
        next.delete(variables.task.id);
        return next;
      });
    },
  });
  return {
    changeStatus: (task: TaskResource, status: TaskStatus) => mutation.mutate({ task, status }),
    pendingIds,
    failure,
  };
}
