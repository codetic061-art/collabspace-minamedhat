import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProjectOverviewChartPoint } from '@/shared/api';

export interface ProjectOverviewChartProps {
  data: readonly ProjectOverviewChartPoint[];
}

/**
 * Lazy-loaded monthly tasks area chart (`ADR-09`, `M16`, `A4`):
 * plots verified `created_tasks` and `completed_tasks` series without unverified filters.
 */
export function ProjectOverviewChart({ data }: ProjectOverviewChartProps) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-body">No chart data available yet.</p>;
  }

  return (
    <div className="h-64 w-full" role="img" aria-label="Monthly created and completed tasks chart">
      <ResponsiveContainer width="100%" height={256} minWidth={1}>
        <AreaChart data={[...data]} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="projectCreatedTasksFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.24} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="projectCompletedTasksFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-teal)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="var(--color-teal)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-neutral)"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: 'var(--color-body)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: 'var(--color-body)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border-subtle)',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          />
          <Area
            type="monotone"
            dataKey="created_tasks"
            name="Created Tasks"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#projectCreatedTasksFill)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="completed_tasks"
            name="Completed Tasks"
            stroke="var(--color-teal)"
            strokeWidth={2}
            fill="url(#projectCompletedTasksFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
