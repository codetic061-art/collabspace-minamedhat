import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/ui';
import { mswServer } from '@/test/setup';
import { TasksPage } from '../pages/TasksPage';

vi.mock('@/features/auth', () => ({
  useSession: () => ({ role: 'Project Manager', user: { id: 3 } }),
}));

const base = 'https://collabspace.huma-volve.com/api/v1';
const task = {
  id: 12,
  name: 'Project B task',
  description: 'Details',
  priority: 'High',
  status: 'Pending',
  due_date: null,
  completed_at: null,
  hours_spent: 0,
  project_id: 2,
  team_id: null,
  assigned_to: null,
  created_by: 3,
  project: { id: 2, name: 'Project B' },
  team: null,
  assignee: null,
  creator: { id: 3, name: 'A User', email: 'user@example.test' },
  attachments_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  localStorage.setItem('collabspace.lastTaskProject', '1');
  mswServer.use(
    http.get(`${base}/projects`, () =>
      HttpResponse.json({
        success: true,
        data: {
          data: [
            { id: 1, name: 'Project A' },
            { id: 2, name: 'Project B' },
          ],
          links: { first: null, last: null, prev: null, next: null },
          meta: { current_page: 1, last_page: 1, per_page: 100, total: 2 },
        },
      }),
    ),
    http.get(`${base}/tasks/12`, () => HttpResponse.json({ success: true, data: task })),
    http.get(`${base}/projects/:id/teams`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${base}/projects/:id/overview`, () =>
      HttpResponse.json({ success: true, data: { name: 'Project B', direct_members: [] } }),
    ),
    http.get(`${base}/projects/:id/tasks/kanban`, ({ params }) =>
      HttpResponse.json({
        success: true,
        data: {
          project: { id: Number(params.id), name: 'Project', progress_percentage: 0 },
          total_tasks: params.id === '2' ? 1 : 0,
          columns: {
            Pending: { name: 'Pending', count: 1, tasks: params.id === '2' ? [task] : [] },
            'In Progress': { name: 'In Progress', count: 0, tasks: [] },
            'In Review': { name: 'In Review', count: 0, tasks: [] },
            Completed: { name: 'Completed', count: 0, tasks: [] },
          },
        },
      }),
    ),
  );
});

function renderPage(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <TasksPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

it('adopts the deep-linked project, keeps filters, and opens Edit', async () => {
  const user = userEvent.setup();
  renderPage('/tasks?taskId=12');
  const dialog = await screen.findByRole('dialog', { name: 'Project B task' });
  await waitFor(() => expect(screen.getByLabelText('Project')).toHaveValue('2'));
  expect(localStorage.getItem('collabspace.lastTaskProject')).toBe('2');
  await user.click(within(dialog).getByRole('button', { name: 'Edit' }));
  const edit = await screen.findByRole('dialog', { name: 'Edit Task' });
  expect(edit).toBeVisible();
  expect(within(edit).getByLabelText('Project')).toHaveValue('Project B');
});

it('keeps board filters and the selected project when details close', async () => {
  localStorage.setItem('collabspace.lastTaskProject', '2');
  const user = userEvent.setup();
  renderPage('/tasks');
  await user.type(await screen.findByLabelText('Search tasks'), 'Project B');
  await user.click(await screen.findByRole('button', { name: 'Project B task' }));
  const dialog = await screen.findByRole('dialog', { name: 'Project B task' });
  await user.click(within(dialog).getByRole('button', { name: /close/i }));
  expect(screen.getByLabelText('Search tasks')).toHaveValue('Project B');
  expect(screen.getByLabelText('Project')).toHaveValue('2');
});

it('clears the team filter when switching projects', async () => {
  mswServer.use(
    http.get(`${base}/projects/:id/teams`, ({ params }) =>
      HttpResponse.json({
        success: true,
        data: params.id === '1' ? [{ id: 7, name: 'Team A' }] : [],
      }),
    ),
  );
  const user = userEvent.setup();
  renderPage('/tasks');
  await screen.findByRole('option', { name: 'Team A' });
  await user.selectOptions(screen.getByLabelText('Team filter'), '7');
  await user.selectOptions(screen.getByLabelText('Project'), '2');
  expect(await screen.findByRole('button', { name: 'Project B task' })).toBeVisible();
  expect(screen.getByLabelText('Team filter')).toHaveValue('');
});
