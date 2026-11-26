import { Link, useParams } from 'react-router';
import { Card, NotFoundState } from '@/shared/ui';

function SlicePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <Card variant="bordered">
        <p className="text-sm text-gray-500">{description}</p>
      </Card>
    </section>
  );
}

/** Placeholder view until WI-7 Dashboard lands. */
export function DashboardPlaceholderPage() {
  return (
    <SlicePlaceholder
      title="Dashboard"
      description="Overview metrics, charts, and activity widgets will appear here."
    />
  );
}

/** Placeholder view until WI-8 Projects lands. */
export function ProjectsPlaceholderPage() {
  return (
    <SlicePlaceholder
      title="Projects"
      description="Paginated projects list and filters will appear here."
    />
  );
}

/** Placeholder view until WI-8 Project Details lands. */
export function ProjectDetailsPlaceholderPage() {
  const { projectId } = useParams();
  return (
    <SlicePlaceholder
      title={projectId ? `Project #${projectId}` : 'Project Details'}
      description="Project overview and Tasks tabs will appear here."
    />
  );
}

/** Placeholder view until WI-9 Tasks & Kanban lands. */
export function TasksPlaceholderPage() {
  return (
    <SlicePlaceholder
      title="Tasks"
      description="Project selector and Kanban board will appear here."
    />
  );
}

/** Placeholder view until WI-10 Profile lands. */
export function ProfilePlaceholderPage() {
  return (
    <SlicePlaceholder
      title="Profile"
      description="Profile overview and assigned tasks will appear here."
    />
  );
}

/** Placeholder view until WI-10 Profile Settings lands. */
export function ProfileSettingsPlaceholderPage() {
  return (
    <SlicePlaceholder
      title="Edit Profile"
      description="Profile settings, avatar management, and password security will appear here."
    />
  );
}

/** Catch-all 404 route inside the app shell. */
export function NotFoundPage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-canvas p-6">
      <NotFoundState
        title="Page not found"
        message="The page you are looking for does not exist."
        action={
          <Link
            to="/"
            className="inline-flex min-h-touch items-center rounded-pill bg-primary px-5 text-sm font-medium text-surface hover:bg-primary/90"
          >
            Back to Dashboard
          </Link>
        }
      />
    </main>
  );
}
