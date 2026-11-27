import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectOverviewChart from '../components/ProjectOverviewChart';
import { dashboardFixture } from './fixtures';

class ResizeObserverStub implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element): void {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 800,
            height: 256,
            top: 0,
            left: 0,
            bottom: 256,
            right: 800,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          },
          // Synthetic ResizeObserverEntry geometry stub for Recharts ResponsiveContainer in jsdom.
        } as ResizeObserverEntry,
      ],
      this,
    );
  }

  unobserve(): void {}

  disconnect(): void {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

describe('ProjectOverviewChart', () => {
  it('renders the verified monthly series container and its text summary', () => {
    const { container } = render(
      <ProjectOverviewChart
        points={dashboardFixture.project_overview.data}
        year={dashboardFixture.project_overview.year}
      />,
    );

    expect(
      screen.getByText('Monthly created and completed tasks for 2026.'),
    ).toBeInTheDocument();
    expect(container.querySelector('.recharts-responsive-container')).not.toBeNull();
  });
});
