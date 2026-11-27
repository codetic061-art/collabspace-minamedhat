import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw/http';
import { expect, it } from 'vitest';
import { mswServer } from '@/test/setup';
import { makeProjectOverview } from './projectsFixtures';
import { API_BASE, renderProjectsRoute, resetSessionForTest } from './projectsTestHarness';

it('mounts the project Kanban board when the Tasks tab is selected', async () => {
  resetSessionForTest();
  let boardRequests = 0;
  mswServer.use(
    http.get(`${API_BASE}/projects/1/overview`, () =>
      HttpResponse.json({ success: true, data: makeProjectOverview() }),
    ),
    http.get(`${API_BASE}/projects/1/teams`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${API_BASE}/projects/1/tasks/kanban`, () => {
      boardRequests += 1;
      return HttpResponse.json({
        success: true,
        data: {
          project: { id: 1, name: 'CollabSpace Alpha', progress_percentage: 0 },
          total_tasks: 0,
          columns: {
            Pending: { name: 'Pending', count: 0, tasks: [] },
            'In Progress': { name: 'In Progress', count: 0, tasks: [] },
            'In Review': { name: 'In Review', count: 0, tasks: [] },
            Completed: { name: 'Completed', count: 0, tasks: [] },
          },
        },
      });
    }),
  );
  renderProjectsRoute('/projects/1', mswServer, 'Project Manager');
  await screen.findByRole('heading', { name: 'CollabSpace Alpha' });
  expect(boardRequests).toBe(0);
  await userEvent.click(screen.getByRole('tab', { name: 'Tasks' }));
  expect(await screen.findByRole('heading', { name: 'Pending (0)' })).toBeVisible();
  expect(boardRequests).toBeGreaterThan(0);
});
