import type {
  ProjectDirectMember,
  ProjectPriority,
  ProjectStatus,
  ProjectTeamProgress,
  UserResource,
} from '@/shared/api';
import type { BadgeVariant, IconCircleTone, StatusTextTone } from '@/shared/ui';

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'Pending',
  'In Progress',
  'On Hold',
  'Completed',
  'Cancelled',
];

export const PROJECT_PRIORITIES: readonly ProjectPriority[] = [
  'Low',
  'Medium',
  'High',
  'Critical',
];

const PROJECT_ACCENT_TONES: readonly IconCircleTone[] = [
  'violet',
  'teal',
  'orange',
  'primary',
  'success',
];

const STATUS_TONE_MAP: Record<ProjectStatus, StatusTextTone> = {
  Pending: 'pending',
  'In Progress': 'in-progress',
  'On Hold': 'on-hold',
  Completed: 'completed',
  Cancelled: 'cancelled',
};

const PRIORITY_BADGE_MAP: Record<ProjectPriority, BadgeVariant> = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical',
};

/** Deterministically maps a project ID to an accent palette tone (M20). */
export function getProjectAccentTone(projectId: number): IconCircleTone {
  const index = Math.abs(Math.trunc(projectId)) % PROJECT_ACCENT_TONES.length;
  return PROJECT_ACCENT_TONES[index] ?? 'primary';
}

/** Maps a verified `ProjectStatus` to its shared `StatusText` color tone (M4). */
export function getProjectStatusTone(status: ProjectStatus): StatusTextTone {
  return STATUS_TONE_MAP[status] ?? 'pending';
}

/** Maps a verified `ProjectPriority` to its shared `Badge` variant (M5). */
export function getProjectPriorityVariant(priority: ProjectPriority): BadgeVariant {
  return PRIORITY_BADGE_MAP[priority] ?? 'neutral';
}

export interface ProjectRosterMember {
  id: number;
  name: string;
  avatarUrl: string | null;
  roleLabel: string;
  isLeader: boolean;
}

/**
 * Combines `direct_members[]` from project overview and `members[]` from `/projects/{id}/teams`
 * according to the active team filter, deduplicating by user `id` for the `"all"` view.
 */
export function buildProjectMemberRoster(
  directMembers: readonly ProjectDirectMember[],
  teams: readonly ProjectTeamProgress[],
  filter: string,
): ProjectRosterMember[] {
  if (filter === 'direct') {
    return directMembers.map((member) => ({
      id: member.id,
      name: member.name,
      avatarUrl: member.avatar_url,
      roleLabel: member.role,
      isLeader: false,
    }));
  }

  if (filter.startsWith('team-')) {
    const teamId = Number.parseInt(filter.slice('team-'.length), 10);
    const selectedTeam = teams.find((team) => team.id === teamId);
    if (!selectedTeam) {
      return [];
    }
    return selectedTeam.members.map((member) => ({
      id: member.id,
      name: member.name,
      avatarUrl: member.avatar_url,
      roleLabel: member.role_in_team,
      isLeader: member.is_leader,
    }));
  }

  const byId = new Map<number, ProjectRosterMember>();

  for (const team of teams) {
    for (const member of team.members) {
      const existing = byId.get(member.id);
      if (existing) {
        if (member.is_leader && !existing.isLeader) {
          byId.set(member.id, {
            ...existing,
            roleLabel: member.role_in_team,
            isLeader: true,
          });
        }
        continue;
      }
      byId.set(member.id, {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatar_url,
        roleLabel: member.role_in_team,
        isLeader: member.is_leader,
      });
    }
  }

  for (const member of directMembers) {
    if (!byId.has(member.id)) {
      byId.set(member.id, {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatar_url,
        roleLabel: member.role,
        isLeader: false,
      });
    }
  }

  return Array.from(byId.values());
}

/** Client-side fallback filter for `/users` picker when server `search` is unsupported or partial (D5, M28). */
export function filterUsersByQuery(
  users: readonly UserResource[],
  searchQuery: string,
): UserResource[] {
  const normalized = searchQuery.trim().toLowerCase();
  if (!normalized) {
    return [...users];
  }
  return users.filter(
    (user) =>
      user.name.toLowerCase().includes(normalized) ||
      user.email.toLowerCase().includes(normalized) ||
      (user.job_title ? user.job_title.toLowerCase().includes(normalized) : false),
  );
}
