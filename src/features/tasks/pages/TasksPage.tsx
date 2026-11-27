import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { getErrorMessage, projectsService, tasksQueries, toAppError } from '@/shared/api';
import { BlockErrorState, Skeleton } from '@/shared/ui';
import { TaskBoard } from './TaskBoard';

const LAST_PROJECT_KEY = 'collabspace.lastTaskProject';

export function TasksPage() {
  const [params] = useSearchParams();
  const rawTask = params.get('taskId');
  const taskId = rawTask && /^\d+$/.test(rawTask) ? Number(rawTask) : 0;
  const [selected, setSelected] = useState(() => {
    try {
      return localStorage.getItem(LAST_PROJECT_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const detail = useQuery({ ...tasksQueries.detail(taskId), enabled: taskId > 0 });
  const projects = useQuery({
    queryKey: ['tasks', 'project-selector'],
    queryFn: async ({ signal }) => {
      const first = await projectsService.listProjects({ per_page: 100, page: 1 }, signal);
      const items = [...first.items];
      for (let page = 2; page <= first.lastPage; page += 1) {
        const next = await projectsService.listProjects({ per_page: 100, page }, signal);
        items.push(...next.items);
      }
      return items;
    },
  });
  if (projects.isPending || (taskId > 0 && detail.isPending)) return <Skeleton variant="card" />;
  if (projects.error)
    return (
      <BlockErrorState
        message={getErrorMessage(toAppError(projects.error))}
        onRetry={() => void projects.refetch()}
      />
    );
  if (taskId > 0 && detail.error)
    return (
      <BlockErrorState
        message={getErrorMessage(toAppError(detail.error))}
        onRetry={() => void detail.refetch()}
      />
    );
  const selectedId = detail.data?.project_id ?? Number(selected);
  const projectId = projects.data.some((item) => item.id === selectedId)
    ? selectedId
    : (projects.data[0]?.id ?? 0);
  return (
    <main className="space-y-5">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      {projects.data.length === 0 ? (
        <p>No projects available yet.</p>
      ) : (
        <>
          <label className="text-sm">
            Project{' '}
            <select
              value={projectId}
              className="rounded-input border border-border-card bg-surface p-2"
              onChange={(event) => {
                setSelected(event.target.value);
                try {
                  localStorage.setItem(LAST_PROJECT_KEY, event.target.value);
                } catch {
                  /* Storage can be unavailable in private browsing. */
                }
              }}
              disabled={taskId > 0}
            >
              {projects.data.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <TaskBoard key={projectId} projectId={projectId} />
        </>
      )}
    </main>
  );
}
