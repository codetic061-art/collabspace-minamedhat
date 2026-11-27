import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Settings } from 'lucide-react';
import { useSession } from '@/features/auth';
import { formatDisplayDate, profileQueries, type ProfileRawTask } from '@/shared/api';
import { toSafeExternalUrl } from '@/shared/lib';
import { Avatar, BlockErrorState, Card, EmptyState, Skeleton, SkeletonRegion } from '@/shared/ui';

function TaskGroup({ title, tasks }: { title: string; tasks: ProfileRawTask[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <h2 className="bg-surface-label px-5 py-4 text-lg font-semibold">
        {title} <span className="text-body">({tasks.length})</span>
      </h2>
      {tasks.length === 0 ? (
        <p className="p-5 text-sm text-body">No tasks in this group.</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"
            >
              <span>{task.name}</span>
              <span className="text-sm text-body">{task.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ProfileTasks() {
  const [page, setPage] = useState(1);
  const query = useQuery(profileQueries.tasks({ page }));
  if (query.isPending)
    return (
      <SkeletonRegion label="Loading tasks">
        <Skeleton variant="card" />
      </SkeletonRegion>
    );
  if (query.isError) return <BlockErrorState onRetry={() => void query.refetch()} />;
  const tasks = query.data.items;
  return (
    <div className="space-y-5">
      {tasks.length === 0 && page === 1 ? (
        <EmptyState message="You have no assigned tasks." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <TaskGroup title="To do" tasks={tasks.filter((task) => task.status !== 'Completed')} />
          <TaskGroup title="Done" tasks={tasks.filter((task) => task.status === 'Completed')} />
        </div>
      )}
      {query.data.lastPage > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {query.data.lastPage}
          </span>
          <button
            type="button"
            disabled={page >= query.data.lastPage}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export function ProfilePage() {
  const { me } = useSession();
  const [tab, setTab] = useState<'overview' | 'tasks'>('overview');
  const tabId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = ['overview', 'tasks'] as const;
  if (!me)
    return (
      <SkeletonRegion label="Loading profile">
        <Skeleton variant="card" />
      </SkeletonRegion>
    );
  const { user, stats, recent_activities: activities } = me;
  return (
    <section className="space-y-10">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar
          name={user.name}
          src={toSafeExternalUrl(user.avatar_url)}
          size="xl"
          badge={
            <Link
              to="/profile/settings"
              aria-label="Edit profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-tint text-primary"
            >
              <Settings size={20} />
            </Link>
          }
        />
        <div className="min-w-48 flex-1">
          <h1 className="text-3xl font-bold text-ink">{user.name}</h1>
          <p className="mt-3 text-heading">
            {user.job_title || 'No job title'}
            {user.created_at ? ` · Joined ${formatDisplayDate(user.created_at)}` : ''}
          </p>
        </div>
        <Card className="min-w-48 flex-1">
          <p className="text-sm">Completed Tasks</p>
          <p className="mt-4 text-3xl font-semibold">{stats.completed_tasks}</p>
        </Card>
        <Card className="min-w-48 flex-1">
          <p className="text-sm">Hours Worked</p>
          <p className="mt-4 text-3xl font-semibold">{stats.hours_worked}</p>
        </Card>
      </div>
      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex gap-6 border-b border-border-subtle"
      >
        {tabs.map((item, index) => (
          <button
            key={item}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${tabId}-${item}-tab`}
            aria-controls={`${tabId}-${item}-panel`}
            aria-selected={tab === item}
            tabIndex={tab === item ? 0 : -1}
            className={`px-4 pb-4 capitalize ${tab === item ? 'border-b-2 border-primary text-primary' : 'text-heading'}`}
            onClick={() => setTab(item)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
              else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
              else if (event.key === 'Home') next = 0;
              else if (event.key === 'End') next = tabs.length - 1;
              else return;
              event.preventDefault();
              setTab(tabs[next] ?? 'overview');
              tabRefs.current[next]?.focus();
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${tabId}-overview-panel`}
        aria-labelledby={`${tabId}-overview-tab`}
        tabIndex={0}
        hidden={tab !== 'overview'}
      >
        <div className="max-w-3xl space-y-10">
          <section>
            <h2 className="mb-5 text-2xl font-medium">About</h2>
            <p className="whitespace-pre-wrap">{user.about || 'No information added yet.'}</p>
          </section>
          <section>
            <h2 className="mb-5 text-2xl font-medium">Recent Activities</h2>
            {activities.length === 0 ? (
              <p className="text-body">No recent activities.</p>
            ) : (
              <ul className="space-y-4">
                {activities.map((activity) => (
                  <li key={activity.id} className="flex flex-wrap justify-between gap-2">
                    <span>{activity.description || activity.action}</span>
                    <time className="text-sm text-body" dateTime={activity.created_at}>
                      {formatDisplayDate(activity.created_at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <div
        role="tabpanel"
        id={`${tabId}-tasks-panel`}
        aria-labelledby={`${tabId}-tasks-tab`}
        tabIndex={0}
        hidden={tab !== 'tasks'}
      >
        {tab === 'tasks' && <ProfileTasks />}
      </div>
    </section>
  );
}
