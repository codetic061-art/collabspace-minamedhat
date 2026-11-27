export { TaskBoard } from './pages/TaskBoard';
export const loadTasksPage = async () => {
  const { TasksPage } = await import('./pages/TasksPage');
  return { Component: TasksPage };
};
