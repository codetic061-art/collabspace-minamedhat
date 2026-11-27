import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { projectsKeys } from '@/shared/api';
import { ToastProvider } from '@/shared/ui';
import { mswServer } from '@/test/setup';
import { TaskBoard } from '../pages/TaskBoard';

vi.mock('@/features/auth', () => ({
  useSession: () => ({ role: 'Team Member', user: { id: 3 } }),
}));

const base = 'https://collabspace.huma-volve.com/api/v1';
const task = {
  id: 1,
  name: 'Write tests',
  description: 'Cover rollback',
  priority: 'High',
  status: 'Pending',
  due_date: null,
  completed_at: null,
  hours_spent: 0,
  project_id: 1,
  team_id: null,
  assigned_to: null,
  created_by: 3,
  project: { id: 1, name: 'Example' },
  team: null,
  assignee: null,
  creator: { id: 3, name: 'A User', email: 'user@example.test' },
  attachments_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function registerReads() {
  mswServer.use(
    http.get(`${base}/projects/1/tasks/kanban`, () =>
      HttpResponse.json({
        success: true,
        data: {
          project: { id: 1, name: 'Example', progress_percentage: 0 },
          total_tasks: 1,
          columns: {
            Pending: { name: 'Pending', count: 1, tasks: [task] },
            'In Progress': { name: 'In Progress', count: 0, tasks: [] },
            'In Review': { name: 'In Review', count: 0, tasks: [] },
            Completed: { name: 'Completed', count: 0, tasks: [] },
          },
        },
      }),
    ),
    http.get(`${base}/projects/1/teams`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${base}/tasks/1`, () => HttpResponse.json({ success: true, data: task })),
  );
}

function renderBoard(path = '/tasks') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <TaskBoard projectId={1} />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return client;
}

describe('task board', () => {
  it.each([403, 500])('moves a task optimistically and rolls back on %i', async (statusCode) => {
    registerReads();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let payload: unknown;
    mswServer.use(
      http.patch(`${base}/tasks/1/status`, async ({ request }) => {
        payload = await request.json();
        await gate;
        return HttpResponse.json(
          { success: false, message: statusCode === 403 ? 'Permission denied' : 'Error' },
          { status: statusCode },
        );
      }),
    );
    const user = userEvent.setup();
    const client = renderBoard();
    client.setQueryData(projectsKeys.detail(1), { id: 1 });
    client.setQueryData(projectsKeys.overview(1), { id: 1 });
    const card = await screen.findByRole('article');
    const select = within(card).getByLabelText('Status for Write tests');
    select.focus();
    expect(select).toHaveFocus();
    await user.selectOptions(select, 'In Progress');
    const progress = screen.getByRole('heading', { name: /In Progress/ }).closest('section');
    expect(progress).not.toBeNull();
    if (!progress) throw new Error('Missing In Progress column');
    expect(within(progress).getByText('Write tests')).toBeInTheDocument();
    release();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    const pending = screen.getByRole('heading', { name: /Pending/ }).closest('section');
    expect(pending).not.toBeNull();
    if (!pending) throw new Error('Missing Pending column');
    await waitFor(() => expect(within(pending).getByText('Write tests')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText('Status for Write tests')).toHaveFocus());
    expect(client.getQueryState(projectsKeys.detail(1))?.isInvalidated).toBe(true);
    expect(client.getQueryState(projectsKeys.overview(1))?.isInvalidated).toBe(true);
    expect(payload).toEqual({ status: 'In Progress' });
  });

  it('opens task details from a shared URL and hides manager actions from a team member', async () => {
    registerReads();
    renderBoard('/tasks?taskId=1');
    const dialog = await screen.findByRole('dialog', { name: 'Write tests' });
    expect(within(dialog).getByText('Cover rollback')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Task/ })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Status')).toBeEnabled();
  });

  it('shows a permission error inside the task details dialog', async () => {
    registerReads();
    mswServer.use(
      http.patch(`${base}/tasks/1/status`, () =>
        HttpResponse.json({ success: false, message: 'Permission denied' }, { status: 403 }),
      ),
    );
    const user = userEvent.setup();
    renderBoard('/tasks?taskId=1');
    const dialog = await screen.findByRole('dialog', { name: 'Write tests' });
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'In Progress');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/permission/i);
  });

  it('disables only the card with a pending status mutation', async () => {
    registerReads();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mswServer.use(
      http.get(`${base}/projects/1/tasks/kanban`, () =>
        HttpResponse.json({
          success: true,
          data: {
            project: { id: 1, name: 'Example', progress_percentage: 0 },
            total_tasks: 2,
            columns: {
              Pending: { name: 'Pending', count: 2, tasks: [task, { ...task, id: 2, name: 'Other task' }] },
              'In Progress': { name: 'In Progress', count: 0, tasks: [] },
              'In Review': { name: 'In Review', count: 0, tasks: [] },
              Completed: { name: 'Completed', count: 0, tasks: [] },
            },
          },
        }),
      ),
      http.patch(`${base}/tasks/1/status`, async () => {
        await gate;
        return HttpResponse.json({ success: false, message: 'Permission denied' }, { status: 403 });
      }),
    );
    const user = userEvent.setup();
    renderBoard();
    await user.selectOptions(await screen.findByLabelText('Status for Write tests'), 'In Progress');
    expect(screen.getByLabelText('Status for Write tests')).toBeDisabled();
    expect(screen.getByLabelText('Status for Other task')).toBeEnabled();
    release();
    await waitFor(() => expect(screen.getByLabelText('Status for Write tests')).toBeEnabled());
  });
});
