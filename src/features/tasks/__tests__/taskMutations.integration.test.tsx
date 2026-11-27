import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { TaskResource } from '@/shared/api';
import { ToastProvider } from '@/shared/ui';
import { renderWithProviders } from '@/test/render';
import { mswServer } from '@/test/setup';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import { TaskFormModal } from '../components/TaskFormModal';

vi.mock('@/features/auth', () => ({
  useSession: () => ({ role: 'Project Manager', user: { id: 1 } }),
}));

const base = 'https://collabspace.huma-volve.com/api/v1';
const task: TaskResource = {
  id: 1,
  name: 'Existing task',
  description: 'Original description',
  priority: 'High',
  status: 'Pending',
  due_date: '2026-12-02',
  completed_at: null,
  hours_spent: 0,
  project_id: 1,
  team_id: null,
  assigned_to: 1,
  created_by: 1,
  project: { id: 1, name: 'Example project' },
  team: null,
  assignee: {
    id: 1,
    name: 'First User',
    email: 'first@example.test',
    avatar_url: null,
    job_title: null,
  },
  creator: { id: 1, name: 'First User', email: 'first@example.test' },
  attachments_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function registerReads() {
  mswServer.use(
    http.get(`${base}/projects/1/overview`, () =>
      HttpResponse.json({
        success: true,
        data: { name: 'Example project', direct_members: [{ id: 2, name: 'Second User' }] },
      }),
    ),
    http.get(`${base}/projects/1/teams`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${base}/tasks/1`, () => HttpResponse.json({ success: true, data: task })),
  );
}

function mount(ui: ReactElement) {
  return renderWithProviders(
    <MemoryRouter>
      <ToastProvider disablePortal>{ui}</ToastProvider>
    </MemoryRouter>,
  );
}

describe('task mutations', () => {
  it('submits a create payload with the selected project and assignee', async () => {
    registerReads();
    let payload: unknown;
    mswServer.use(
      http.post(`${base}/tasks`, async ({ request }) => {
        payload = await request.json();
        return HttpResponse.json({ success: true, data: task });
      }),
    );
    const close = vi.fn();
    mount(<TaskFormModal projectId={1} initialStatus="Pending" task={null} onClose={close} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Task Name/i), 'New task');
    await waitFor(() => expect(screen.getByLabelText('Assignee')).toBeEnabled());
    await user.selectOptions(screen.getByLabelText('Assignee'), '2');
    await user.selectOptions(screen.getByLabelText('Priority'), 'High');
    await user.click(screen.getByRole('button', { name: 'Create Task' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(payload).toEqual({
      name: 'New task',
      description: null,
      priority: 'High',
      status: 'Pending',
      due_date: null,
      project_id: 1,
      assigned_to: 2,
    });
    expect(screen.getByText('Task created.')).toBeVisible();
  });

  it('submits an edit payload and reassigns when the assignee changes', async () => {
    registerReads();
    let payload: unknown;
    let assignment: unknown;
    mswServer.use(
      http.put(`${base}/tasks/1`, async ({ request }) => {
        payload = await request.json();
        return HttpResponse.json({ success: true, data: task });
      }),
      http.patch(`${base}/tasks/1/assign`, async ({ request }) => {
        assignment = await request.json();
        return HttpResponse.json({ success: true, data: task });
      }),
    );
    const close = vi.fn();
    mount(<TaskFormModal projectId={1} initialStatus="Pending" task={task} onClose={close} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/Task Name/i));
    await user.type(screen.getByLabelText(/Task Name/i), 'Revised task');
    await waitFor(() => expect(screen.getByLabelText('Assignee')).toBeEnabled());
    await user.selectOptions(screen.getByLabelText('Assignee'), '2');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(payload).toEqual({
      name: 'Revised task',
      description: 'Original description',
      priority: 'High',
      status: 'Pending',
      due_date: '2026-12-02',
    });
    expect(assignment).toEqual({ assigned_to: 2 });
    expect(screen.getByText('Task updated.')).toBeVisible();
  });

  it('reassigns from details and deletes only after confirmation', async () => {
    registerReads();
    let assignment: unknown;
    let deletions = 0;
    mswServer.use(
      http.patch(`${base}/tasks/1/assign`, async ({ request }) => {
        assignment = await request.json();
        return HttpResponse.json({ success: true, data: task });
      }),
      http.delete(`${base}/tasks/1`, () => {
        deletions += 1;
        return HttpResponse.json({ success: true, message: 'Deleted.' });
      }),
    );
    const close = vi.fn();
    mount(
      <TaskDetailsModal
        taskId={1}
        projectId={1}
        onClose={close}
        onEdit={vi.fn()}
        onStatus={vi.fn()}
        isStatusPending={false}
      />,
    );
    const user = userEvent.setup();
    const dialog = await screen.findByRole('dialog', { name: 'Existing task' });
    await waitFor(() => expect(within(dialog).getByLabelText('Reassign')).toBeEnabled());
    await user.selectOptions(within(dialog).getByLabelText('Reassign'), '2');
    await waitFor(() => expect(assignment).toEqual({ assigned_to: 2 }));
    expect(await screen.findByText('Task assignment updated.')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    const confirmation = await screen.findByRole('dialog', { name: 'Delete task?' });
    expect(deletions).toBe(0);
    await user.click(within(confirmation).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deletions).toBe(1));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(screen.getByText('Task deleted.')).toBeVisible();
  });
});
