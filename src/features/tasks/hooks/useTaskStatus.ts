import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  getErrorMessage,
  moveKanbanTaskOptimistically,
  tasksKeys,
  tasksService,
  toAppError,
  type KanbanBoardData,
  type TaskResource,
  type TaskStatus,
} from '@/shared/api';

export function useTaskStatus(projectId: number) {
  const client = useQueryClient();
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: ({ task, status }: { task: TaskResource; status: TaskStatus }) =>
      tasksService.updateTaskStatus(task.id, { status }),
    onMutate: async ({ task, status }) => {
      setMessage('');
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
      return { previous, previousDetail };
    },
    onError: (error, variables, context) => {
      if (context?.previous) client.setQueryData(tasksKeys.board(projectId), context.previous);
      if (context?.previousDetail)
        client.setQueryData(tasksKeys.detail(variables.task.id), context.previousDetail);
      setMessage(getErrorMessage(toAppError(error)));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
  return {
    changeStatus: (task: TaskResource, status: TaskStatus) => mutation.mutate({ task, status }),
    isPending: mutation.isPending,
    message,
  };
}
