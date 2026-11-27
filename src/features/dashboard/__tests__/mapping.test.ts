import { describe, expect, it } from 'vitest';
import { normalizeDashboardPriority } from '../utils/priority';
import { PROJECT_ACCENTS, projectAccent } from '../utils/projectAccent';
import { dashboardStatusTone } from '../utils/taskStatus';

describe('Dashboard display mappings', () => {
  it('normalises lowercase dashboard priorities without inventing values', () => {
    expect(normalizeDashboardPriority('low')).toEqual({ label: 'Low', variant: 'low' });
    expect(normalizeDashboardPriority('medium')).toEqual({
      label: 'Medium',
      variant: 'medium',
    });
    expect(normalizeDashboardPriority('high')).toEqual({ label: 'High', variant: 'high' });
    expect(normalizeDashboardPriority('critical')).toEqual({
      label: 'Critical',
      variant: 'critical',
    });
    expect(normalizeDashboardPriority('urgent')).toEqual({
      label: 'urgent',
      variant: 'neutral',
    });
  });

  it('maps lowercase dashboard statuses to the shared status palette', () => {
    expect(dashboardStatusTone('pending')).toBe('pending');
    expect(dashboardStatusTone('in_progress')).toBe('in-progress');
    expect(dashboardStatusTone('in_review')).toBe('review');
    expect(dashboardStatusTone('completed')).toBe('completed');
    expect(dashboardStatusTone('unknown')).toBe('pending');
  });

  it('derives a stable project accent from the project id', () => {
    expect(PROJECT_ACCENTS).toHaveLength(5);
    expect(projectAccent(10)).toBe('violet');
    expect(projectAccent(11)).toBe('teal');
    expect(projectAccent(10)).toBe(projectAccent(10));
    expect(projectAccent(-1)).toBe('primary');
    expect(projectAccent(Number.NaN)).toBe('primary');
  });
});
