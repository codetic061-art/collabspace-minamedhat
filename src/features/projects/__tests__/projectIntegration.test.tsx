import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { mswServer } from '@/test/setup';
import { makeProjectListItem, makeProjectOverview } from './projectsFixtures';
import { API_BASE, renderProjectsRoute, resetSessionForTest } from './projectsTestHarness';

describe('Projects create -> list integration (Layer 3)', () => {
  beforeEach(() => {
    resetSessionForTest();
  });

  it('creates a project and immediately invalidates/refetches so it appears in the list', async () => {
    const user = userEvent.setup();
    const projectStore = [makeProjectListItem({ id: 1, name: 'Initial Project' })];

    mswServer.use(
      http.get(`${API_BASE}/projects`, () =>
        HttpResponse.json({
          success: true,
          message: 'Projects retrieved successfully.',
          data: {
            data: projectStore,
            links: { first: null, last: null, prev: null, next: null },
            meta: {
              current_page: 1,
              from: 1,
              last_page: 1,
              links: [],
              path: `${API_BASE}/projects`,
              per_page: 15,
              to: projectStore.length,
              total: projectStore.length,
            },
          },
        }),
      ),
      http.get(`${API_BASE}/teams`, () =>
        HttpResponse.json({
          success: true,
          message: 'Teams retrieved successfully.',
          data: {
            data: [],
            links: { first: null, last: null, prev: null, next: null },
            meta: {
              current_page: 1,
              from: null,
              last_page: 1,
              links: [],
              path: `${API_BASE}/teams`,
              per_page: 100,
              to: null,
              total: 0,
            },
          },
        }),
      ),
      http.post(`${API_BASE}/projects`, async ({ request }) => {
        const body = (await request.json()) as {
          name: string;
          start_date: string;
          deadline: string;
        };
        const createdItem = makeProjectListItem({
          id: 2,
          name: body.name,
          start_date: body.start_date,
          deadline: body.deadline,
          teams: [],
        });
        projectStore.unshift(createdItem);
        return HttpResponse.json(
          {
            success: true,
            message: 'Project created.',
            data: makeProjectOverview({ id: 2, name: body.name }),
          },
          { status: 201 },
        );
      }),
    );

    renderProjectsRoute('/projects', mswServer, 'Administrator');
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Initial Project')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /Add Project/i }));
    const dialog = await screen.findByRole('dialog', { name: 'New Project' });

    await user.type(within(dialog).getByLabelText(/Project Name/i), 'Phoenix Release');
    await user.type(within(dialog).getByLabelText(/Start Date/i), '2026-12-01');
    await user.type(within(dialog).getByLabelText(/Deadline/i), '2026-12-30');
    await user.click(within(dialog).getByRole('button', { name: 'Add Project' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'New Project' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Project created.')).toBeVisible();
    expect(await within(screen.getByRole('table')).findByText('Phoenix Release')).toBeVisible();
  });
});
