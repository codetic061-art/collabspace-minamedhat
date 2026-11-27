import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsKeys, tasksKeys, tasksService } from '@/shared/api';
import { useToast } from '@/shared/ui';

export function useTaskAssignment(taskId: number) {
  const client = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (assignedTo: number | null) =>
      tasksService.assignTask(taskId, { assigned_to: assignedTo }),
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: tasksKeys.all });
    },
    onSuccess: () => {
      showToast({ message: 'Task assignment updated.', tone: 'success' });
    },
  });
}

export function useTaskDeletion(taskId: number, onClose: () => void, onError: () => void) {
  const client = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: () => tasksService.deleteTask(taskId),
    onError,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: tasksKeys.all }),
        client.invalidateQueries({ queryKey: projectsKeys.all }),
      ]);
      showToast({ message: 'Task deleted.', tone: 'success' });
      onClose();
    },
  });
}
