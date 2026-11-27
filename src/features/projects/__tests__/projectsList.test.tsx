import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { mswServer } from '@/test/setup';
import { makeProjectListItem } from './projectsFixtures';
import { API_BASE, renderProjectsRoute, resetSessionForTest } from './projectsTestHarness';

function makeP1ProjectsResponse(
  items: ReturnType<typeof makeProjectListItem>[],
  metaOverrides: Partial<{
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  }> = {},
) {
  const currentPage = metaOverrides.current_page ?? 1;
  const lastPage = metaOverrides.last_page ?? 1;
  const perPage = metaOverrides.per_page ?? 15;
  const total = metaOverrides.total ?? items.length;

  return {
    success: true,
    message: 'Projects retrieved successfully.',
    data: {
      data: items,
      links: {
        first: `${API_BASE}/projects?page=1`,
        last: `${API_BASE}/projects?page=${lastPage}`,
        prev: currentPage > 1 ? `${API_BASE}/projects?page=${currentPage - 1}` : null,
        next: currentPage < lastPage ? `${API_BASE}/projects?page=${currentPage + 1}` : null,
      },
      meta: {
        current_page: currentPage,
        from: items.length > 0 ? (currentPage - 1) * perPage + 1 : null,
        last_page: lastPage,
        links: [],
        path: `${API_BASE}/projects`,
        per_page: perPage,
        to: items.length > 0 ? (currentPage - 1) * perPage + items.length : null,
        total,
      },
    },
  };
}

describe('ProjectsListPage (Layer 2)', () => {
  beforeEach(() => {
    resetSessionForTest();
  });

  it('renders loading, server pagination, team chips (+N), status colors, and excludes delete', async () => {
    const user = userEvent.setup();
    const seenRequests: Array<{
      page: string | null;
      perPage: string | null;
      sort: string | null;
    }> = [];

    mswServer.use(
      http.get(`${API_BASE}/projects`, ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get('page');
        seenRequests.push({
          page,
          perPage: url.searchParams.get('per_page'),
          sort: url.searchParams.get('sort'),
        });

        if (page === '2') {
          return HttpResponse.json(
            makeP1ProjectsResponse(
              [
                makeProjectListItem({
                  id: 2,
                  name: 'Beta Portal',
                  status: 'Completed',
                  priority: 'Critical',
                  teams: [{ id: 5, name: 'QA' }],
                }),
              ],
              { current_page: 2, last_page: 2, per_page: 15, total: 16 },
            ),
          );
        }

        return HttpResponse.json(
          makeP1ProjectsResponse(
            [
              makeProjectListItem({
                id: 1,
                name: 'Alpha Launch',
                status: 'In Progress',
                priority: 'High',
                files_count: 22,
                teams: [
                  { id: 1, name: 'UI/UX' },
                  { id: 2, name: 'Frontend' },
                  { id: 3, name: 'Backend' },
                  { id: 4, name: 'DevOps' },
                ],
              }),
            ],
            { current_page: 1, last_page: 2, per_page: 15, total: 16 },
          ),
        );
      }),
    );

    const { container, router } = renderProjectsRoute('/projects', mswServer, 'Administrator');

    expect(await screen.findByRole('heading', { level: 1, name: 'All Projects' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Add Project/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();

    const table = await screen.findByRole('table');
    const alphaLink = within(table).getByRole('link', { name: 'Alpha Launch' });
    expect(alphaLink).toHaveAttribute('href', '/projects/1');
    expect(within(table).getByText('In Progress')).toHaveClass('text-status-in-progress');
    expect(within(table).getByText('22 Files')).toBeVisible();
    expect(within(table).getByText('UI/UX')).toBeVisible();
    expect(within(table).getByText('Frontend')).toBeVisible();
    expect(within(table).getByText('+2')).toBeVisible();
    expect(within(table).queryByText('Backend')).not.toBeInTheDocument();

    // Mobile card list markup is also rendered in DOM for <768px responsiveness.
    const mobileList = screen.getByRole('list', { name: 'Projects list' });
    expect(within(mobileList).getByRole('link', { name: 'Alpha Launch' })).toBeInTheDocument();

    await expectNoA11yViolations(container);

    await user.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => {
      expect(within(screen.getByRole('table')).getByText('Beta Portal')).toBeVisible();
    });

    expect(router.state.location.search).toContain('page=2');
    expect(router.state.location.search).toContain('sort=newest');
    expect(seenRequests[0]).toEqual({ page: '1', perPage: '15', sort: 'newest' });
    expect(seenRequests[1]).toEqual({ page: '2', perPage: '15', sort: 'newest' });
  });

  it('syncs search, status filter, and sort=newest with URL and survives reload', async () => {
    const user = userEvent.setup();
    const seenQueries: Array<{
      search: string | null;
      status: string | null;
      sort: string | null;
    }> = [];

    mswServer.use(
      http.get(`${API_BASE}/projects`, ({ request }) => {
        const url = new URL(request.url);
        seenQueries.push({
          search: url.searchParams.get('search'),
          status: url.searchParams.get('status'),
          sort: url.searchParams.get('sort'),
        });

        const item =
          url.searchParams.get('status') === 'On Hold'
            ? makeProjectListItem({ id: 9, name: 'Gamma Infra', status: 'On Hold' })
            : makeProjectListItem({ id: 1, name: 'Alpha Launch', status: 'In Progress' });

        return HttpResponse.json(makeP1ProjectsResponse([item]));
      }),
    );

    const firstRender = renderProjectsRoute('/projects', mswServer, 'Project Manager');
    await screen.findByRole('table');

    await user.type(screen.getByLabelText('Search projects'), 'Gamma');
    await waitFor(() => {
      expect(firstRender.router.state.location.search).toContain('search=Gamma');
    });

    const statusTrigger = screen.getByRole('combobox', { name: 'Filter by status' });
    await user.click(statusTrigger);
    await user.click(screen.getByRole('option', { name: 'On Hold' }));

    await waitFor(() => {
      expect(firstRender.router.state.location.search).toContain('status=On+Hold');
      expect(firstRender.router.state.location.search).toContain('sort=newest');
      expect(within(screen.getByRole('table')).getByText('Gamma Infra')).toBeVisible();
    });

    const reloadUrl = `${firstRender.router.state.location.pathname}${firstRender.router.state.location.search}`;
    firstRender.unmount();

    // Reload directly at the shared URL.
    renderProjectsRoute(reloadUrl, mswServer, 'Project Manager');
    expect(await screen.findByDisplayValue('Gamma')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toHaveTextContent('On Hold');
    const hasExpectedQuery = seenQueries.some(
      (q) => q.search === 'Gamma' && q.status === 'On Hold' && q.sort === 'newest',
    );
    expect(hasExpectedQuery).toBe(true);
  });

  it('hides Add Project for Team Member and handles empty, 403, 5xx retry, and 401 states', async () => {
    const user = userEvent.setup();
    let attempt = 0;

    mswServer.use(
      http.get(`${API_BASE}/projects`, () => {
        attempt += 1;
        if (attempt === 1) {
          return HttpResponse.json(makeP1ProjectsResponse([]));
        }
        if (attempt === 2) {
          return HttpResponse.json(
            { success: false, message: 'Forbidden', errors: null },
            { status: 403 },
          );
        }
        return HttpResponse.json(
          { success: false, message: 'Database crashed', errors: null },
          { status: 500 },
        );
      }),
    );

    // 1) Empty state as Team Member (unverified assumption D6: hides Add Project)
    const emptyRender = renderProjectsRoute('/projects', mswServer, 'Team Member');
    expect(await screen.findByText('No projects yet')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Add Project/i })).not.toBeInTheDocument();
    emptyRender.unmount();

    // 2) 403 Forbidden state
    const forbiddenRender = renderProjectsRoute('/projects', mswServer, 'Team Member');
    expect(
      await forbiddenRender.findByRole('heading', {
        level: 1,
        name: "You don't have access to this page.",
      }),
    ).toBeVisible();
    forbiddenRender.unmount();

    // 3) 500 Server error with Retry (exhausting 2 bounded retries first)
    mswServer.use(
      http.get(`${API_BASE}/projects`, () =>
        HttpResponse.json(
          { success: false, message: 'SQLSTATE internal detail', errors: null },
          { status: 500 },
        ),
      ),
    );
    const errorRender = renderProjectsRoute('/projects', mswServer, 'Project Manager');
    expect(
      await errorRender.findByText('Something went wrong on our side. Please try again.'),
    ).toBeVisible();
    expect(errorRender.queryByText(/SQLSTATE/i)).not.toBeInTheDocument();
    expect(errorRender.getByRole('button', { name: 'Retry' })).toBeVisible();

    mswServer.use(
      http.get(`${API_BASE}/projects`, () =>
        HttpResponse.json(makeP1ProjectsResponse([makeProjectListItem({ name: 'Recovered' })])),
      ),
    );
    await user.click(errorRender.getByRole('button', { name: 'Retry' }));
    expect(await errorRender.findByText('Recovered')).toBeVisible();
    errorRender.unmount();

    // 4) 401 redirects to Sign in
    mswServer.use(
      http.get(`${API_BASE}/projects`, () =>
        HttpResponse.json(
          { success: false, message: 'Unauthenticated.', errors: null },
          { status: 401 },
        ),
      ),
    );
    const unauthRender = renderProjectsRoute('/projects', mswServer, 'Project Manager');
    expect(await unauthRender.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  }, 15000);
});
