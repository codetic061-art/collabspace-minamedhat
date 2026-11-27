import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useSession } from '@/features/auth';
import { getErrorMessage, toAppError } from '@/shared/api';
import { hasCapability } from '@/shared/lib';
import {
  AccessDeniedState,
  BlockErrorState,
  Button,
  EmptyState,
  buttonClassName,
} from '@/shared/ui';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { ProjectsFiltersToolbar } from '../components/ProjectsFiltersToolbar';
import { ProjectsListSkeleton } from '../components/ProjectsListSkeleton';
import { ProjectsPagination } from '../components/ProjectsPagination';
import { ProjectsTable } from '../components/ProjectsTable';
import { useProjectsList } from '../hooks/useProjectsList';
import { useProjectsListParams } from '../hooks/useProjectsListParams';

/**
 * All Projects page (`1:8545`, M4, M19, M25, §12.10, §12.11):
 * URL-synchronized search, status filter, `sort=newest`, server pagination, and role-gated create modal.
 */
export function ProjectsListPage() {
  const { role } = useSession();
  const canCreateProject = hasCapability(role, 'create_project');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const {
    page,
    search,
    status,
    sort,
    hasActiveFilters,
    setSearch,
    setStatus,
    setPage,
    clearFilters,
  } = useProjectsListParams();

  const projectsQuery = useProjectsList({ page, search, status });

  const renderContent = () => {
    if (projectsQuery.isPending) {
      return <ProjectsListSkeleton />;
    }

    if (projectsQuery.error) {
      const appError = toAppError(projectsQuery.error);
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

      return (
        <BlockErrorState
          message={getErrorMessage(appError)}
          onRetry={() => void projectsQuery.refetch()}
        />
      );
    }

    const result = projectsQuery.data;
    if (!result || result.items.length === 0) {
      if (hasActiveFilters) {
        return (
          <EmptyState
            title="No matching projects"
            message="No projects match your current search or status filter."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        );
      }

      return (
        <EmptyState
          title="No projects yet"
          message="There are no projects in this workspace yet."
          action={
            canCreateProject ? (
              <Button
                variant="primary"
                rightIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                onClick={() => setIsCreateOpen(true)}
              >
                Add Project
              </Button>
            ) : undefined
          }
        />
      );
    }

    return (
      <div className="space-y-4">
        <ProjectsTable projects={result.items} isRefreshing={projectsQuery.isFetching} />
        <ProjectsPagination
          currentPage={result.currentPage}
          lastPage={result.lastPage}
          perPage={result.perPage}
          total={result.total}
          onPageChange={setPage}
        />
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">All Projects</h1>
        {canCreateProject ? (
          <Button
            variant="primary"
            rightIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setIsCreateOpen(true)}
          >
            Add Project
          </Button>
        ) : null}
      </div>

      <ProjectsFiltersToolbar
        search={search}
        status={status}
        sort={sort}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
      />

      {renderContent()}

      {canCreateProject ? (
        <ProjectFormModal
          mode="create"
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      ) : null}
    </section>
  );
}
