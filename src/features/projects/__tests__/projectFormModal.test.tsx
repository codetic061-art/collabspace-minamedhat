import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { mswServer } from '@/test/setup';
import {
  makeProjectListItem,
  makeProjectOverview,
  makeTeamResource,
  makeUserResource,
} from './projectsFixtures';
import { API_BASE, renderProjectsRoute, resetSessionForTest } from './projectsTestHarness';

describe('ProjectFormModal create and edit flows (Layer 2)', () => {
  beforeEach(() => {
    resetSessionForTest();
  });

  it('loads /users only when picker opens, debounces search with per_page=20, applies fallback filter, validates dates, maps 422, and submits StoreProjectRequest', async () => {
    const user = userEvent.setup();
    const userRequests: Array<{ perPage: string | null; search: string | null }> = [];
    let capturedCreateBody: Record<string, unknown> | null = null;
    let postAttempt = 0;

    const allUsers = [
      makeUserResource({ id: 21, name: 'Maya Lin', email: 'maya@example.test', job_title: 'QA' }),
      makeUserResource({
        id: 22,
        name: 'Samir Farid',
        email: 'samir@example.test',
        job_title: 'Backend',
      }),
    ];

    mswServer.use(
      http.get(`${API_BASE}/projects`, () =>
        HttpResponse.json({
          success: true,
          message: 'Projects retrieved successfully.',
          data: {
            data: [makeProjectListItem()],
            links: { first: null, last: null, prev: null, next: null },
            meta: {
              current_page: 1,
              from: 1,
              last_page: 1,
              links: [],
              path: `${API_BASE}/projects`,
              per_page: 15,
              to: 1,
              total: 1,
            },
          },
        }),
      ),
      http.get(`${API_BASE}/teams`, () =>
        HttpResponse.json({
          success: true,
          message: 'Teams retrieved successfully.',
          data: {
            data: [makeTeamResource({ id: 10, name: 'Frontend' })],
            links: { first: null, last: null, prev: null, next: null },
            meta: {
              current_page: 1,
              from: 1,
              last_page: 1,
              links: [],
              path: `${API_BASE}/teams`,
              per_page: 100,
              to: 1,
              total: 1,
            },
          },
        }),
      ),
      http.get(`${API_BASE}/users`, ({ request }) => {
        const url = new URL(request.url);
        userRequests.push({
          perPage: url.searchParams.get('per_page'),
          search: url.searchParams.get('search'),
        });
        // Simulate server ignoring `search` to prove client-side fallback filtering (D5, M28).
        return HttpResponse.json({
          success: true,
          data: allUsers,
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 2 },
        });
      }),
      http.post(`${API_BASE}/projects`, async ({ request }) => {
        postAttempt += 1;
        capturedCreateBody = (await request.json()) as Record<string, unknown>;
        if (postAttempt === 1) {
          return HttpResponse.json(
            {
              success: false,
              message: 'Validation failed.',
              errors: { name: ['The name has already been taken.'] },
            },
            { status: 422 },
          );
        }
        return HttpResponse.json(
          {
            success: true,
            message: 'Project created.',
            data: makeProjectOverview({ id: 99, name: 'New Apollo' }),
          },
          { status: 201 },
        );
      }),
    );

    renderProjectsRoute('/projects', 'Administrator');
    await user.click(await screen.findByRole('button', { name: /Add Project/i }));

    const dialog = await screen.findByRole('dialog', { name: 'New Project' });
    expect(within(dialog).queryByText(/Drag and drop/i)).not.toBeInTheDocument();
    expect(userRequests).toHaveLength(0);

    // Open member picker -> loads /users with per_page=20.
    await user.click(within(dialog).getByRole('button', { name: /Add Members/i }));
    await waitFor(() => expect(userRequests).toHaveLength(1));
    expect(userRequests[0]).toEqual({ perPage: '20', search: null });
    expect(await within(dialog).findByRole('option', { name: /Maya Lin/i })).toBeVisible();

    // Debounced search + client-side fallback filter hides Samir even though server returned both.
    await user.type(within(dialog).getByPlaceholderText(/Search people/i), 'Maya');
    await waitFor(() => {
      expect(userRequests.some((req) => req.search === 'Maya' && req.perPage === '20')).toBe(true);
    });
    expect(within(dialog).getByRole('option', { name: /Maya Lin/i })).toBeVisible();
    expect(within(dialog).queryByRole('option', { name: /Samir Farid/i })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('option', { name: /Maya Lin/i }));
    await user.keyboard('{Escape}');
    // Escape closed picker only, leaving modal open.
    expect(screen.getByRole('dialog', { name: 'New Project' })).toBeInTheDocument();

    // Select a team
    await user.click(within(dialog).getByRole('button', { name: /Teams/i }));
    await user.click(await within(dialog).findByRole('option', { name: 'Frontend' }));
    await user.keyboard('{Escape}');

    const nameInput = within(dialog).getByLabelText(/Project Name/i);
    const startInput = within(dialog).getByLabelText(/Start Date/i);
    const deadlineInput = within(dialog).getByLabelText(/Deadline/i);

    await user.type(nameInput, 'New Apollo');
    await user.type(startInput, '2026-12-10');
    await user.type(deadlineInput, '2026-12-01');
    await user.click(within(dialog).getByRole('button', { name: 'Add Project' }));

    expect(
      await within(dialog).findByText('Deadline must be on or after the start date.'),
    ).toBeVisible();
    expect(capturedCreateBody).toBeNull();

    // Fix deadline -> hit 422 -> preserves values & focuses name input.
    await user.clear(deadlineInput);
    await user.type(deadlineInput, '2026-12-20');
    await user.click(within(dialog).getByRole('button', { name: 'Add Project' }));

    expect(await within(dialog).findByText('The name has already been taken.')).toBeVisible();
    expect(nameInput).toHaveValue('New Apollo');
    expect(nameInput).toHaveFocus();

    await expectNoA11yViolations(document.body);

    // Retry submit -> succeeds with exact StoreProjectRequest fields.
    await user.click(within(dialog).getByRole('button', { name: 'Add Project' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'New Project' })).not.toBeInTheDocument();
    });

    expect(capturedCreateBody).toEqual({
      name: 'New Apollo',
      start_date: '2026-12-10',
      deadline: '2026-12-20',
      priority: 'High',
      status: 'Pending',
      teams: [10],
      members: [{ user_id: 21 }],
    });
  });

  it('pre-fills Edit Project from overview, omits members, sends UpdateProjectRequest only, and handles 403 on save', async () => {
    const user = userEvent.setup();
    let capturedUpdateBody: Record<string, unknown> | null = null;
    let putAttempt = 0;

    mswServer.use(
      http.get(`${API_BASE}/projects/1/overview`, () =>
        HttpResponse.json({
          success: true,
          message: 'Project overview retrieved successfully.',
          data: makeProjectOverview(),
        }),
      ),
      http.get(`${API_BASE}/projects/1/teams`, () =>
        HttpResponse.json({
          success: true,
          message: 'Project teams and progress retrieved successfully.',
          data: [],
        }),
      ),
      http.get(`${API_BASE}/teams`, () =>
        HttpResponse.json({
          success: true,
          message: 'Teams retrieved successfully.',
          data: {
            data: [makeTeamResource({ id: 10, name: 'Frontend' })],
            links: { first: null, last: null, prev: null, next: null },
            meta: {
              current_page: 1,
              from: 1,
              last_page: 1,
              links: [],
              path: `${API_BASE}/teams`,
              per_page: 100,
              to: 1,
              total: 1,
            },
          },
        }),
      ),
      http.put(`${API_BASE}/projects/1`, async ({ request }) => {
        putAttempt += 1;
        capturedUpdateBody = (await request.json()) as Record<string, unknown>;
        if (putAttempt === 1) {
          return HttpResponse.json(
            { success: false, message: 'Forbidden', errors: null },
            { status: 403 },
          );
        }
        return HttpResponse.json({
          success: true,
          message: 'Project updated.',
          data: makeProjectOverview({ name: 'CollabSpace Alpha v2' }),
        });
      }),
    );

    renderProjectsRoute('/projects/1', 'Project Manager');
    await user.click(await screen.findByRole('button', { name: 'Edit Project' }));

    const dialog = await screen.findByRole('dialog', { name: 'Edit Project' });
    expect(within(dialog).queryByText(/Add Members/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Drag and drop/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();

    const nameInput = within(dialog).getByLabelText(/Project Name/i);
    expect(nameInput).toHaveValue('CollabSpace Alpha');

    await user.clear(nameInput);
    await user.type(nameInput, 'CollabSpace Alpha v2');

    // First save hits 403 -> keeps dialog open and values preserved.
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));
    expect(
      await within(dialog).findByRole('alert'),
    ).toHaveTextContent("You don't have permission to do this.");
    expect(nameInput).toHaveValue('CollabSpace Alpha v2');

    // Second save succeeds and sends UpdateProjectRequest without members.
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit Project' })).not.toBeInTheDocument();
    });

    expect(capturedUpdateBody).toEqual({
      name: 'CollabSpace Alpha v2',
      description: 'Primary team collaboration release.',
      start_date: '2026-10-12',
      deadline: '2026-12-25',
      priority: 'High',
      status: 'In Progress',
      teams: [10],
    });
    expect('members' in (capturedUpdateBody ?? {})).toBe(false);
  });
});
