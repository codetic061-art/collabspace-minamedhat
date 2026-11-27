import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthToken, resetUnauthorizedGuard } from '@/shared/lib';
import { expectNoA11yViolations } from '@/test/a11y';
import { renderWithProviders } from '@/test/render';
import { mswServer } from '@/test/setup';
import { DashboardPage } from '../pages/DashboardPage';
import { dashboardFixture, emptyDashboardFixture, teamDetailFixture } from './fixtures';

vi.mock('../components/ProjectOverviewChart', () => ({
  default: () => <p>Project overview chart</p>,
}));

const BASE = 'https://collabspace.huma-volve.com/api/v1';

interface RequestCounters {
  dashboard: number;
  teams: number;
  tier2: number;
}

interface HandlerOptions {
  dashboardStatus?: number;
}

function renderDashboard() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/']}>
      <DashboardPage />
    </MemoryRouter>,
  );
}

function renderDashboardWithMain() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/']}>
      <main>
        <DashboardPage />
      </main>
    </MemoryRouter>,
  );
}

function installHandlers(
  dashboardData = dashboardFixture,
  options: HandlerOptions = {},
): RequestCounters {
  const counters: RequestCounters = { dashboard: 0, teams: 0, tier2: 0 };

  mswServer.use(
    http.get(`${BASE}/dashboard`, () => {
      counters.dashboard += 1;
      if (options.dashboardStatus) {
        return HttpResponse.json(
          { success: false, message: 'Request failed.' },
          { status: options.dashboardStatus },
        );
      }
      return HttpResponse.json({ success: true, data: dashboardData });
    }),
    http.get(`${BASE}/teams`, () => {
      counters.teams += 1;
      return HttpResponse.json({
        success: true,
        data: { data: [], links: {}, meta: {} },
      });
    }),
    http.get(`${BASE}/teams/:teamId`, ({ params }) => {
      counters.teams += 1;
      return HttpResponse.json({
        success: true,
        message: 'Team retrieved successfully.',
        data: { ...teamDetailFixture, id: Number(params.teamId) },
      });
    }),
    http.get(`${BASE}/notifications`, () => {
      counters.tier2 += 1;
      return HttpResponse.json({ success: true, data: [] });
    }),
    http.get(`${BASE}/meetings`, () => {
      counters.tier2 += 1;
      return HttpResponse.json({ success: true, data: { data: [], links: {}, meta: {} } });
    }),
    http.get(`${BASE}/files`, () => {
      counters.tier2 += 1;
      return HttpResponse.json({ success: true, data: { data: [], links: {}, meta: {} } });
    }),
    http.get(`${BASE}/search`, () => {
      counters.tier2 += 1;
      return HttpResponse.json({ success: true, data: [] });
    }),
  );

  return counters;
}

beforeEach(() => {
  clearAuthToken();
  resetUnauthorizedGuard();
});

describe('DashboardPage', () => {
  it('renders all sections from one request without Tier 2 calls', async () => {
    const counters = installHandlers();

    renderDashboard();

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);

    expect(await screen.findByRole('heading', { name: 'Pending Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In Progress' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Completion Rate' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Pending Tasks percentage' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
    expect(screen.getByRole('img', { name: 'Overall task completion: 60%' })).toBeInTheDocument();

    expect(await screen.findByText('Project overview chart')).toBeInTheDocument();

    const projectsHeading = screen.getByRole('heading', { name: 'Active Projects' });
    const projectsCard = projectsHeading.closest('section, div')?.parentElement;
    expect(projectsCard).not.toBeNull();
    expect(screen.getByText('Borealis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Apollo/i })).toHaveAttribute('href', '/projects/10');
    expect(screen.getByRole('progressbar', { name: 'Apollo progress' })).toHaveAttribute(
      'aria-valuenow',
      '38',
    );
    expect(screen.getByText('Tasks: 3 / 8')).toBeInTheDocument();

    const taskItem = screen.getByText('Wire dashboard').closest('li');
    if (!taskItem) {
      throw new Error('Expected the dashboard task to render inside a list item.');
    }
    const task = within(taskItem);
    expect(task.getByText('High')).toBeInTheDocument();
    expect(task.getByText('In Progress')).toBeInTheDocument();
    expect(task.getByText('Due Dec 1, 2026')).toBeInTheDocument();
    expect(task.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(task.queryByText(/%/)).not.toBeInTheDocument();

    // Tier 1 View All links go to Projects and Tasks; Meetings and Files stay without View All (M33).
    const viewAllLinks = screen.getAllByRole('link', { name: 'View All' });
    expect(viewAllLinks.map((link) => link.getAttribute('href'))).toEqual(['/projects', '/tasks']);

    // Removed MVP elements (M13, M16, M31): no Ask AI, no chart filters, no trend lines.
    expect(screen.queryByText(/Ask AI/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/from last month/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /All Projects|This Year/i })).toBeNull();

    expect(screen.getByText('Sprint review')).toBeInTheDocument();
    expect(screen.getByText('2:00 PM - 3:00 PM')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Sam Lee' }).length).toBeGreaterThan(0);

    expect(screen.getByText('brief.pdf')).toBeInTheDocument();
    expect(screen.getByText('By Sam Lee')).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: 'Select a team' })).toBeInTheDocument();

    expect(counters.dashboard).toBe(1);
    expect(counters.teams).toBe(0);
    expect(counters.tier2).toBe(0);
  });

  it('renders an empty state in every list section', async () => {
    const counters = installHandlers(emptyDashboardFixture);

    renderDashboard();

    expect(await screen.findByText('No active projects yet.')).toBeInTheDocument();
    expect(screen.getByText('No tasks to show yet.')).toBeInTheDocument();
    expect(screen.getByText('No teams yet.')).toBeInTheDocument();
    expect(screen.getByText('No upcoming meetings.')).toBeInTheDocument();
    expect(screen.getByText('No recent files.')).toBeInTheDocument();
    expect(screen.getByText('No project activity for this period yet.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Overall task completion: 0%' })).toBeInTheDocument();

    expect(counters.dashboard).toBe(1);
    expect(counters.teams).toBe(0);
    expect(counters.tier2).toBe(0);
  });

  it('keeps failures isolated per card and refetches the shared query on retry', async () => {
    let calls = 0;
    mswServer.use(
      http.get(`${BASE}/dashboard`, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(
            { success: false, message: 'Server error.' },
            { status: 500 },
          );
        }
        return HttpResponse.json({ success: true, data: dashboardFixture });
      }),
    );

    renderDashboard();

    const retries = await screen.findAllByRole('button', { name: 'Retry' });
    expect(retries.length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByRole('heading', { name: 'Pending Tasks' })).not.toBeInTheDocument();

    const firstRetry = retries[0];
    if (!firstRetry) {
      throw new Error('Expected at least one Retry button.');
    }
    await userEvent.click(firstRetry);

    expect(await screen.findByRole('heading', { name: 'Pending Tasks' })).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('renders the page-level access denied state on 403', async () => {
    installHandlers(dashboardFixture, { dashboardStatus: 403 });

    renderDashboard();

    expect(
      await screen.findByRole('heading', {
        name: "You don't have access to this page.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Workspace statistics' })).not.toBeInTheDocument();
  });

  it('renders nothing on 401 because the session layer owns the redirect', async () => {
    installHandlers(dashboardFixture, { dashboardStatus: 401 });

    const { container } = renderDashboard();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('loads team members only after selection and isolates team-fetch errors', async () => {
    const counters = installHandlers();
    let teamCalls = 0;
    const baseMember = teamDetailFixture.members[0];
    if (!baseMember) {
      throw new Error('Expected teamDetailFixture to contain a member.');
    }
    mswServer.use(
      http.get(`${BASE}/teams/:teamId`, ({ params }) => {
        teamCalls += 1;
        if (teamCalls === 1) {
          return HttpResponse.json(
            { success: false, message: 'Team lookup failed.' },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          success: true,
          message: 'Team retrieved successfully.',
          data: {
            ...teamDetailFixture,
            id: Number(params.teamId),
            members: [
              {
                ...baseMember,
                avatar_url: 'javascript:alert(1)',
              },
            ],
          },
        });
      }),
    );

    renderDashboard();

    const select = await screen.findByRole('combobox', { name: 'Select a team' });
    expect(counters.teams).toBe(0);

    await userEvent.selectOptions(select, '5');

    const retryBtn = await screen.findByRole('button', { name: 'Retry' });
    // Sibling cards remain healthy when only the Teams lookup fails.
    expect(screen.getByRole('heading', { name: 'Active Projects' })).toBeInTheDocument();

    await userEvent.click(retryBtn);

    expect(await screen.findByText('Sam Lee')).toBeInTheDocument();
    expect(screen.getByText('Team Lead')).toBeInTheDocument();
    expect(screen.getByText('Leader')).toBeInTheDocument();
    expect(teamCalls).toBe(2);

    const member = screen.getByText('Sam Lee').closest('li');
    if (!member) {
      throw new Error('Expected the team member to render inside a list item.');
    }
    expect(member.querySelector('img')).toBeNull();
    expect(within(member).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(member).queryByText(/\d+\s*\/\s*\d+/)).not.toBeInTheDocument();
  });

  it('is accessible and never renders unsafe URLs or file download links', async () => {
    const baseMeeting = dashboardFixture.upcoming_meetings.items[0];
    if (!baseMeeting) {
      throw new Error('Expected dashboardFixture to contain a meeting.');
    }
    installHandlers({
      ...dashboardFixture,
      upcoming_meetings: {
        items: [
          {
            ...baseMeeting,
            participants: [
              { id: 1, name: 'Sam Lee', avatar_url: 'javascript:alert(1)' },
              { id: 2, name: 'Ada Kim', avatar_url: 'http://insecure.example/avatar.png' },
            ],
          },
        ],
      },
    });

    const { container } = renderDashboardWithMain();

    const fileHeading = await screen.findByRole('heading', { name: 'Recent Files' });
    const filesCard = fileHeading.closest('div')?.parentElement;
    if (!filesCard) {
      throw new Error('Expected Recent Files card container.');
    }

    await expectNoA11yViolations(container);
    expect(filesCard.querySelectorAll('a')).toHaveLength(0);
    expect(container.querySelector('[download]')).toBeNull();
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull();
    expect(container.querySelector('img[src^="http://"]')).toBeNull();
    expect(screen.queryByText('/api/v1/files/31/download')).not.toBeInTheDocument();
  });
});
