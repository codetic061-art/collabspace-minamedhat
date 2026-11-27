import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { getErrorMessage, projectsKeys, projectsService, tasksQueries, toAppError } from '@/shared/api';
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
  const adoptedTask = useRef<number | null>(null);
  useEffect(() => {
    if (!taskId) {
      adoptedTask.current = null;
      return;
    }
    if (!detail.data || adoptedTask.current === taskId) return;
    adoptedTask.current = taskId;
    const project = String(detail.data.project_id);
    setSelected(project);
    try {
      localStorage.setItem(LAST_PROJECT_KEY, project);
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
  }, [taskId, detail.data]);
  const projects = useQuery({
    queryKey: [...projectsKeys.all, 'task-project-selector'],
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
  if (projects.isPending)
    return (
      <section className="space-y-5">
        <h1 className="text-[31px] font-semibold leading-[1.5]">Tasks</h1>
        <Skeleton variant="card" />
      </section>
    );
  if (projects.error)
    return (
      <section className="space-y-5">
        <h1 className="text-[31px] font-semibold leading-[1.5]">Tasks</h1>
        <BlockErrorState
          message={getErrorMessage(toAppError(projects.error))}
          onRetry={() => void projects.refetch()}
        />
      </section>
    );
  const selectedId = Number(selected);
  const projectId = projects.data.some((item) => item.id === selectedId)
    ? selectedId
    : (projects.data[0]?.id ?? 0);
  return (
    <section className="space-y-5">
      <h1 className="text-[31px] font-semibold leading-[1.5]">Tasks</h1>
      {projects.data.length === 0 ? (
        <p>No projects available yet.</p>
      ) : (
        <>
          <label className="flex items-center">
            <span className="sr-only">Project</span>
            <select
              value={projectId}
              className="h-10 rounded-[16px] border border-ink bg-surface px-4 py-2 text-sm"
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
          <TaskBoard projectId={projectId} />
        </>
      )}
    </section>
  );
}
