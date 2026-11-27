/**
 * Public entry point for the Projects feature (`WI-8`).
 *
 * Central route integration required in `src/app/router.tsx`:
 * - Replace `/projects` placeholder lazy loader with `loadProjectsListPage`
 * - Replace `/projects/:projectId` placeholder lazy loader with `loadProjectDetailsPage`
 *
 * The Tasks tab is mounted by `ProjectDetailsPage` through the public
 * `@/features/tasks` entry point; this slot type remains for future composition.
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
