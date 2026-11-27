import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '@/test/a11y';
import { mswServer } from '@/test/setup';
import { makeProjectOverview, makeProjectTeamsProgress } from './projectsFixtures';
import { API_BASE, renderProjectsRoute, resetSessionForTest } from './projectsTestHarness';

describe('ProjectDetailsPage (Layer 2)', () => {
  beforeEach(() => {
    resetSessionForTest();
  });

  it('renders Overview by default without Project Type or deferred tabs, and merges members with Leader tags', async () => {
    const user = userEvent.setup();
    const overview = makeProjectOverview();
    const teams = makeProjectTeamsProgress();

    mswServer.use(
      http.get(`${API_BASE}/projects/1/overview`, () =>
        HttpResponse.json({
          success: true,
          message: 'Project overview retrieved successfully.',
          data: overview,
        }),
      ),
      http.get(`${API_BASE}/projects/1/teams`, () =>
        HttpResponse.json({
          success: true,
          message: 'Project teams and progress retrieved successfully.',
          data: teams,
        }),
      ),
    );

    const { container } = renderProjectsRoute('/projects/1', mswServer, 'Project Manager');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'CollabSpace Alpha' }),
    ).toBeVisible();
    expect(screen.getByText('78% Completed')).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Due Date' })).toBeVisible();
    expect(screen.getByText('28 days left')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit Project' })).toBeVisible();

    // Deferred Tasks tab and Tier 2 Teams/Files tabs stay hidden.
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: 'Tasks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Teams' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Files' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();

    // Verified overview fields shown, Project Type excluded (M17).
    expect(screen.getByText('Primary team collaboration release.')).toBeVisible();
    expect(screen.queryByText(/Project Type/i)).not.toBeInTheDocument();
    expect(screen.queryByText('SaaS')).not.toBeInTheDocument();
    expect(screen.getByText('100')).toBeVisible();
    expect(screen.getByText('20/100')).toBeVisible();

    // Combined direct + team members with Leader tag from is_leader.
    const roster = await screen.findByRole('list', { name: 'Team members' });
    expect(within(roster).getByText('Salma Nabil')).toBeVisible();
    expect(within(roster).getByText('Karim Zaki')).toBeVisible();
    expect(within(roster).getByText('Laila Mansour')).toBeVisible();
    expect(within(roster).getByText('Dana Farouk')).toBeVisible();
    expect(within(roster).getAllByText('Leader')).toHaveLength(1);

    // Filter Team Members dropdown to a single team.
    await user.click(screen.getByRole('combobox', { name: 'Filter members by team' }));
    await user.click(screen.getByRole('option', { name: 'Design' }));
    await waitFor(() => {
      expect(within(roster).getByText('Laila Mansour')).toBeVisible();
      expect(within(roster).queryByText('Salma Nabil')).not.toBeInTheDocument();
    });

    await expectNoA11yViolations(container);
  });

  it('hides Edit Project for Team Member and handles 403 and 404 states', async () => {
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
    );

    const tmRender = renderProjectsRoute('/projects/1', mswServer, 'Team Member');
    await tmRender.findByRole('heading', { level: 1, name: 'CollabSpace Alpha' });
    expect(tmRender.queryByRole('button', { name: 'Edit Project' })).not.toBeInTheDocument();
    tmRender.unmount();

    mswServer.use(
      http.get(`${API_BASE}/projects/99/overview`, () =>
        HttpResponse.json(
          {
            success: false,
            message: 'No query results for model [App\\Models\\Project] 99',
            errors: null,
          },
          { status: 404 },
        ),
      ),
      http.get(`${API_BASE}/projects/99/teams`, () =>
        HttpResponse.json({ success: false, message: 'Not found', errors: null }, { status: 404 }),
      ),
    );

    const notFoundRender = renderProjectsRoute('/projects/99', mswServer, 'Project Manager');
    expect(
      await notFoundRender.findByRole('heading', { level: 1, name: 'Project not found' }),
    ).toBeVisible();
    expect(notFoundRender.queryByText(/App\\Models\\Project/i)).not.toBeInTheDocument();
    notFoundRender.unmount();

    mswServer.use(
      http.get(`${API_BASE}/projects/42/overview`, () =>
        HttpResponse.json(
          { success: false, message: 'This action is unauthorized.', errors: null },
          { status: 403 },
        ),
      ),
      http.get(`${API_BASE}/projects/42/teams`, () =>
        HttpResponse.json({ success: false, message: 'Forbidden', errors: null }, { status: 403 }),
      ),
    );

    const forbiddenRender = renderProjectsRoute('/projects/42', mswServer, 'Project Manager');
    expect(
      await forbiddenRender.findByRole('heading', {
        level: 1,
        name: "You don't have access to this page.",
      }),
    ).toBeVisible();
    expect(forbiddenRender.getByRole('link', { name: 'Back to Dashboard' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
