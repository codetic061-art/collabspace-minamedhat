import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { profileService } from '@/shared/api';
import { ToastProvider } from '@/shared/ui';
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
const refreshMe = vi.fn().mockResolvedValue(undefined);
vi.mock('@/features/auth', () => ({ useSession: () => ({ me, refreshMe }) }));
const base = 'https://collabspace.huma-volve.com/api/v1';

describe('Profile', () => {
  it('sends a null current project as an empty multipart field', async () => {
    let project: FormDataEntryValue | null = null;
    let phone: FormDataEntryValue | null = null;
    let omitted = true;
    mswServer.use(
      http.post(`${base}/auth/profile`, async ({ request }) => {
        const data = await request.formData();
        project = data.get('current_project_id');
        phone = data.get('phone');
        omitted = !data.has('about');
        return HttpResponse.json({ success: true, data: me.user });
      }),
    );
    await profileService.updateProfile({ current_project_id: null, phone: null });
    expect(project).toBe('');
    expect(phone).toBe('');
    expect(omitted).toBe(true);
  });

  it('saves profile fields and gives success feedback without unmounting the form', async () => {
    refreshMe.mockClear();
    let submittedName: FormDataEntryValue | null = null;
    mswServer.use(
      http.post(`${base}/auth/profile`, async ({ request }) => {
        submittedName = (await request.formData()).get('name');
        return HttpResponse.json({ success: true, data: me.user });
      }),
    );
    renderWithProviders(
      <MemoryRouter>
        <ToastProvider>
          <ProfileSettingsPage />
        </ToastProvider>
      </MemoryRouter>,
    );
    const name = screen.getByLabelText('Full name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Updated User');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Profile updated.')).toBeVisible();
    expect(submittedName).toBe('Updated User');
    expect(screen.getByLabelText('Full name')).toBe(name);
    expect(refreshMe).toHaveBeenCalledTimes(1);
  });

  it('removes an avatar and shows success feedback', async () => {
    refreshMe.mockClear();
    Object.assign(me.user, { avatar_url: 'https://example.test/avatar.png' });
    let calls = 0;
    mswServer.use(
      http.delete(`${base}/auth/profile/avatar`, () => {
        calls += 1;
        return HttpResponse.json({ success: true, data: { ...me.user, avatar_url: null } });
      }),
    );
    try {
      renderWithProviders(
        <MemoryRouter>
          <ToastProvider>
            <ProfileSettingsPage />
          </ToastProvider>
        </MemoryRouter>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Remove avatar' }));
      expect(await screen.findByText('Avatar removed.')).toBeVisible();
      expect(calls).toBe(1);
      expect(refreshMe).toHaveBeenCalledTimes(1);
    } finally {
      Object.assign(me.user, { avatar_url: null });
    }
  });

  it('does not re-upload the same avatar on a later save', async () => {
    const NativeURL = URL;
    vi.stubGlobal(
      'URL',
      class extends NativeURL {
        static createObjectURL() {
          return 'blob:test';
        }
        static revokeObjectURL() {}
      },
    );
    vi.stubGlobal(
      'Image',
      class {
        width = 100;
        height = 100;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          this.onload?.();
        }
      },
    );
    const update = vi.spyOn(profileService, 'updateProfile').mockResolvedValue({
      ...me.user,
      status: 'active',
      available_status: 'available',
      roles: [],
      permissions: [],
      google_linked: false,
      facebook_linked: false,
      linkedin_linked: false,
      updated_at: null,
    });
    try {
      renderWithProviders(
        <MemoryRouter>
          <ToastProvider>
            <ProfileSettingsPage />
          </ToastProvider>
        </MemoryRouter>,
      );
      const input = screen.getByLabelText('Avatar');
      await userEvent.upload(input, new File(['image'], 'avatar.png', { type: 'image/png' }));
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
      expect(update.mock.calls[0][0].avatar).toBeInstanceOf(File);
      await waitFor(() => expect(input).toHaveValue(''));
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
      expect(update.mock.calls[1][0].avatar).toBeNull();
    } finally {
      update.mockRestore();
      vi.unstubAllGlobals();
    }
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

  it('supports keyboard navigation between linked profile tabs', async () => {
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
    const user = userEvent.setup();
    const overview = screen.getByRole('tab', { name: 'overview' });
    const tasks = screen.getByRole('tab', { name: 'tasks' });
    overview.focus();
    await user.keyboard('{ArrowRight}');
    expect(tasks).toHaveFocus();
    expect(tasks).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'tasks' })).toHaveAttribute(
      'id',
      tasks.getAttribute('aria-controls'),
    );
    await user.keyboard('{Home}');
    expect(overview).toHaveFocus();
    expect(overview).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'overview' })).toBeVisible();
  });

  it('does not render an insecure API avatar URL', () => {
    Object.assign(me.user, { avatar_url: 'http://example.test/avatar.png' });
    try {
      renderWithProviders(
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>,
      );
      expect(screen.getByRole('img', { name: 'Example User' }).tagName).not.toBe('IMG');
    } finally {
      Object.assign(me.user, { avatar_url: null });
    }
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
        <ToastProvider>
          <ProfileSettingsPage />
        </ToastProvider>
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
        <ToastProvider>
          <ProfileSettingsPage />
        </ToastProvider>
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText('Current password'), 'current-password');
    await userEvent.type(screen.getByLabelText('New password'), 'new-password');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different-password');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(screen.getByText('Passwords must match.')).toBeInTheDocument());
    expect(calls).toBe(0);
  });

  it('shows a toast after a successful password change', async () => {
    mswServer.use(
      http.put(`${base}/auth/password`, () =>
        HttpResponse.json({ success: true, message: 'Password changed.' }),
      ),
    );
    renderWithProviders(
      <MemoryRouter>
        <ToastProvider>
          <ProfileSettingsPage />
        </ToastProvider>
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText('Current password'), 'current-password');
    await userEvent.type(screen.getByLabelText('New password'), 'new-password');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-password');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Password changed.')).toBeVisible();
    expect(screen.getByLabelText('New password')).toHaveValue('');
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
        <ToastProvider>
          <ProfileSettingsPage />
        </ToastProvider>
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
        <ToastProvider>
          <ProfileSettingsPage />
        </ToastProvider>
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
