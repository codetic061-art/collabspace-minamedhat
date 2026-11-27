/**
 * Public entry point for the Projects feature (`WI-8`).
 *
 * Central route integration required in `src/app/router.tsx`:
 * - Replace `/projects` placeholder lazy loader with `loadProjectsListPage`
 * - Replace `/projects/:projectId` placeholder lazy loader with `loadProjectDetailsPage`
 *
 * Future Tasks tab boundary (`WI-9`):
 * Once `WI-9` exports its public board component from `@/features/tasks`,
 * `ProjectDetailsPage` will mount it inside a `'tasks'` tab receiving `ProjectTasksTabSlotProps`.
 */
export interface ProjectTasksTabSlotProps {
  projectId: number;
  projectName: string;
}

export async function loadProjectsListPage() {
  const { ProjectsListPage } = await import('./pages/ProjectsListPage');
  return { Component: ProjectsListPage };
}

export async function loadProjectDetailsPage() {
  const { ProjectDetailsPage } = await import('./pages/ProjectDetailsPage');
  return { Component: ProjectDetailsPage };
}
