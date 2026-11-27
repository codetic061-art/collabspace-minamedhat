import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { profileService } from '@/shared/api';
import { renderWithProviders } from '@/test/render';
import { mswServer } from '@/test/setup';
import { ProfilePage } from '../ProfilePage';
import { ProfileSettingsPage } from '../ProfileSettingsPage';

const me = {
  user: {
    id: 1,
    name: 'Example User',
    email: 'example@example.test',
    job_title: 'Designer',
    about: 'About me',
    years_of_experience: 4,
    phone: '',
    avatar_url: null,
    available_status: 'available',
    current_project_id: null,
    created_at: null,
  },
  stats: { completed_tasks: 3, hours_worked: 8 },
  projects: [],
  recent_activities: [],
};
vi.mock('@/features/auth', () => ({ useSession: () => ({ me, retryRestore: vi.fn() }) }));
const base = 'https://collabspace.huma-volve.com/api/v1';

describe('Profile', () => {
  it('sends a null current project as an empty multipart field', async () => {
    let project: FormDataEntryValue | null = null;
    mswServer.use(
      http.post(`${base}/auth/profile`, async ({ request }) => {
        const data = await request.formData();
        project = data.get('current_project_id');
        return HttpResponse.json({ success: true, data: me.user });
      }),
    );
    await profileService.updateProfile({ current_project_id: null });
    expect(project).toBe('');
  });
  it('shows session data and groups assigned tasks', async () => {
    mswServer.use(
      http.get(`${base}/auth/profile/tasks`, () =>
        HttpResponse.json({
          success: true,
          data: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 2,
            data: [
              { id: 1, name: 'First task', status: 'Pending' },
              { id: 2, name: 'Finished task', status: 'Completed' },
            ],
          },
        }),
      ),
    );
    renderWithProviders(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('About me')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'tasks' }));
    expect(await screen.findByText('First task')).toBeInTheDocument();
    expect(screen.getByText('Finished task')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('preserves settings and maps server validation onto the field', async () => {
    mswServer.use(
      http.post(`${base}/auth/profile`, () =>
        HttpResponse.json(
          { success: false, message: 'Validation failed.', errors: { name: ['Name is invalid.'] } },
          { status: 422 },
        ),
      ),
    );
    renderWithProviders(
      <MemoryRouter>
        <ProfileSettingsPage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Name is invalid.')).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Example User');
  });

  it('validates password confirmation and does not send a mismatched password', async () => {
    let calls = 0;
    mswServer.use(
      http.put(`${base}/auth/password`, () => {
        calls += 1;
        return HttpResponse.json({ success: true, data: null });
      }),
    );
    renderWithProviders(
      <MemoryRouter>
        <ProfileSettingsPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText('Current password'), 'current-password');
    await userEvent.type(screen.getByLabelText('New password'), 'new-password');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different-password');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(screen.getByText('Passwords must match.')).toBeInTheDocument());
    expect(calls).toBe(0);
  });

  it('reports an empty assigned-task list', async () => {
    mswServer.use(
      http.get(`${base}/auth/profile/tasks`, () =>
        HttpResponse.json({
          success: true,
          data: { current_page: 1, last_page: 1, per_page: 15, total: 0, data: [] },
        }),
      ),
    );
    renderWithProviders(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('tab', { name: 'tasks' }));
    expect(await screen.findByText('You have no assigned tasks.')).toBeInTheDocument();
  });

  it('rejects oversized avatars before saving', async () => {
    renderWithProviders(
      <MemoryRouter>
        <ProfileSettingsPage />
      </MemoryRouter>,
    );
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    });
    await userEvent.upload(screen.getByLabelText('Avatar'), file);
    expect(await screen.findByText('The image must be 2 MB or less.')).toBeInTheDocument();
  });

  it('maps password validation errors without clearing input', async () => {
    mswServer.use(
      http.put(`${base}/auth/password`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Invalid.',
            errors: { current_password: ['Incorrect password.'] },
          },
          { status: 422 },
        ),
      ),
    );
    renderWithProviders(
      <MemoryRouter>
        <ProfileSettingsPage />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText('Current password'), 'wrong-password');
    await userEvent.type(screen.getByLabelText('New password'), 'new-password');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-password');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Incorrect password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Current password')).toHaveValue('wrong-password');
  });
});
