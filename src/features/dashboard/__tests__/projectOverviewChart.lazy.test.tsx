import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { ProjectOverviewCard } from '../components/ProjectOverviewCard';
import type { DashboardQueryResult } from '../hooks/useDashboard';
import { dashboardFixture } from './fixtures';

vi.mock('../components/ProjectOverviewChart', () => ({
  default: () => <p>Project overview chart</p>,
}));

describe('ProjectOverviewCard lazy chart', () => {
  it('shows the chart skeleton while the lazy chunk resolves', async () => {
    // The card only reads these four query fields, so a narrow stub avoids building a
    // full UseQueryResult for a test that is about the Suspense/lazy boundary.
    const query = {
      data: dashboardFixture,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as DashboardQueryResult;

    renderWithProviders(<ProjectOverviewCard query={query} />);

    expect(screen.getByRole('status', { name: 'Loading chart' })).toBeInTheDocument();

    expect(await screen.findByText('Project overview chart')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading chart' })).not.toBeInTheDocument();
  });
});
