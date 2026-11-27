import type { ProjectPriority, ProjectStatus } from '@/shared/api';
import { Badge, StatusText } from '@/shared/ui';
import { getProjectPriorityVariant, getProjectStatusTone } from '../utils/projectPresentation';

/** Borderless colored project status text label matching All Projects (`1:8545`, M4). */
export function ProjectStatusText({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <StatusText tone={getProjectStatusTone(status)} className={className}>
      {status}
    </StatusText>
  );
}

/** Semantic priority pill badge supporting Low, Medium, High, and Critical (`1:8545`, M5). */
export function ProjectPriorityBadge({
  priority,
  className,
}: {
  priority: ProjectPriority;
  className?: string;
}) {
  return (
    <Badge variant={getProjectPriorityVariant(priority)} className={className}>
      {priority}
    </Badge>
  );
}
