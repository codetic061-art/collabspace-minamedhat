import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { expect, it, vi } from 'vitest';
import { mswServer } from '@/test/setup';
import { TaskFormModal } from '../components/TaskFormModal';

const base = 'https://collabspace.huma-volve.com/api/v1';

it('deduplicates project members and preserves the input when the server rejects it', async () => {
  mswServer.use(
    http.get(`${base}/projects/1/overview`, () => HttpResponse.json({
      success: true,
      data: { name: 'Project', direct_members: [{ id: 2, name: 'A Member' }] },
    })),
    http.get(`${base}/projects/1/teams`, () => HttpResponse.json({
      success: true,
      data: [{ id: 3, name: 'Team', members: [{ id: 2, name: 'A Member' }] }],
    })),
    http.post(`${base}/tasks`, () => HttpResponse.json({
      success: false,
      message: 'Validation failed',
      errors: { name: ['Name already exists.'] },
    }, { status: 422 })),
  );
  const user = userEvent.setup();
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><TaskFormModal projectId={1} initialStatus="In Review" task={null} onClose={onClose} /></QueryClientProvider>);
  await screen.findByRole('option', { name: 'A Member' });
  expect(screen.getAllByRole('option', { name: 'A Member' })).toHaveLength(1);
  expect(screen.getByLabelText('Status')).toHaveValue('In Review');
  await user.type(screen.getByLabelText(/Task Name/), 'Existing task');
  await user.click(screen.getByRole('button', { name: 'Create Task' }));
  expect(await screen.findByText('Name already exists.')).toBeInTheDocument();
  expect(screen.getByLabelText(/Task Name/)).toHaveValue('Existing task');
  expect(onClose).not.toHaveBeenCalled();
});
