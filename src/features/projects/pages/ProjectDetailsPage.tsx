import { useId, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useSession } from '@/features/auth';
import { getErrorMessage, toAppError } from '@/shared/api';
import { hasCapability } from '@/shared/lib';
import {
  AccessDeniedState,
  BlockErrorState,
  NotFoundState,
  TabPanel,
  Tabs,
  buttonClassName,
  type TabItem,
} from '@/shared/ui';
import { ProjectDetailsHeader } from '../components/ProjectDetailsHeader';
import { ProjectDetailsSkeleton } from '../components/ProjectDetailsSkeleton';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { ProjectOverviewTab } from '../components/ProjectOverviewTab';
import { parseProjectIdParam, useProjectDetails } from '../hooks/useProjectDetails';
import { TaskBoard } from '@/features/tasks';

const OVERVIEW_TAB_ITEMS: readonly TabItem[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
];

/**
 * Project Details page (`1:8753`, §3.5, §3.6, §12.6, M17):
 * displays Overview tab by default with header, Due Date card, role-gated Edit Project modal,
 * Team Members roster, and the public Tasks tab. Teams/Files tabs are Tier 2.
 */
export function ProjectDetailsPage() {
  const { projectId: rawProjectId } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = parseProjectIdParam(rawProjectId);
  const { role } = useSession();
  const canEditProject = hasCapability(role, 'edit_project');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.has('taskId') ? 'tasks' : 'overview',
  );
  const tabsId = useId();

  const { overviewQuery, teamsQuery } = useProjectDetails(projectId);

  if (projectId === null) {
    return (
      <NotFoundState
        title="Project not found"
        message="This project doesn't exist or was removed."
        action={
          <Link to="/projects" className={buttonClassName({ variant: 'primary' })}>
            Back to Projects
          </Link>
        }
      />
    );
  }

  if (overviewQuery.isPending) {
    return <ProjectDetailsSkeleton />;
  }

  if (overviewQuery.error) {
    const appError = toAppError(overviewQuery.error);
    if (appError.kind === 'unauthorized') {
      return null;
    }
    if (appError.kind === 'forbidden') {
      return (
        <AccessDeniedState
          action={
            <Link to="/" className={buttonClassName({ variant: 'primary' })}>
              Back to Dashboard
            </Link>
          }
        />
      );
    }
    if (appError.kind === 'not_found') {
      return (
        <NotFoundState
          title="Project not found"
          message="This project doesn't exist or was removed."
          action={
            <Link to="/projects" className={buttonClassName({ variant: 'primary' })}>
              Back to Projects
            </Link>
          }
        />
      );
    }

    return (
      <BlockErrorState
        message={getErrorMessage(appError)}
        onRetry={() => void overviewQuery.refetch()}
      />
    );
  }

  const project = overviewQuery.data;

  return (
    <section className="space-y-6">
      <ProjectDetailsHeader
        project={project}
        canEdit={canEditProject}
        onEdit={() => setIsEditOpen(true)}
      />

      <Tabs
        idPrefix={tabsId}
        ariaLabel="Project sections"
        items={OVERVIEW_TAB_ITEMS}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      <TabPanel idPrefix={tabsId} tabKey="overview" isActive={activeTab === 'overview'}>
        <ProjectOverviewTab
          project={project}
          teams={teamsQuery.data ?? []}
          isTeamsLoading={teamsQuery.isPending}
          teamsError={teamsQuery.error}
          onRetryTeams={() => void teamsQuery.refetch()}
        />
      </TabPanel>
      <TabPanel idPrefix={tabsId} tabKey="tasks" isActive={activeTab === 'tasks'}>
        <TaskBoard projectId={projectId} />
      </TabPanel>

      {canEditProject ? (
        <ProjectFormModal
          mode="edit"
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          project={project}
        />
      ) : null}
    </section>
  );
}
