import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardProjectChartPoint } from '@/shared/api';

export interface ProjectOverviewChartProps {
  points: DashboardProjectChartPoint[];
  year: number;
}

/**
 * Heavy chart implementation, loaded through `React.lazy` only on the Dashboard route
 * (ADR-09). It plots the verified `created_tasks` and `completed_tasks` series with no
 * filters (M16) and exposes a text summary for assistive technology.
 */
export default function ProjectOverviewChart({ points, year }: ProjectOverviewChartProps) {
  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="createdTasksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="completedTasksGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-subtle)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'var(--color-body)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              width={40}
              tick={{ fontSize: 12, fill: 'var(--color-body)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                borderColor: 'var(--color-border-subtle)',
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="created_tasks"
              name="Created tasks"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#createdTasksGradient)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="completed_tasks"
              name="Completed tasks"
              stroke="var(--color-success)"
              strokeWidth={2}
              fill="url(#completedTasksGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">Monthly created and completed tasks for {year}.</p>
    </div>
  );
}
