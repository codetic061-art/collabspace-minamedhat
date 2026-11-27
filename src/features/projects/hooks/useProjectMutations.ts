import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dashboardKeys,
  projectsKeys,
  projectsService,
  type CreateProjectPayload,
  type UpdateProjectPayload,
} from '@/shared/api';
import { useToast } from '@/shared/ui';

/** Project create mutation invalidating project lists and dashboard summaries on confirmation (ID-19). */
export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsService.createProject(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
      showToast({ message: 'Project created.', tone: 'success' });
    },
  });
}

/** Project update mutation invalidating affected project caches and lists on confirmation (ID-19). */
export function useUpdateProjectMutation(projectId: number) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) =>
      projectsService.updateProject(projectId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
      showToast({ message: 'Project updated.', tone: 'success' });
    },
  });
}
