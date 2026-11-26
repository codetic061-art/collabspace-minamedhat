export type SystemRole = 'Administrator' | 'Project Manager' | 'Team Member';

export type Capability =
  | 'view_dashboard'
  | 'view_projects'
  | 'create_project'
  | 'edit_project'
  | 'view_tasks'
  | 'create_task'
  | 'edit_task'
  | 'delete_task'
  | 'assign_task'
  | 'change_task_status'
  | 'view_profile'
  | 'edit_profile';

const KNOWN_ROLES = new Set<SystemRole>(['Administrator', 'Project Manager', 'Team Member']);

const ADMIN_AND_PM_CAPABILITIES: readonly Capability[] = [
  'view_dashboard',
  'view_projects',
  'create_project',
  'edit_project',
  'view_tasks',
  'create_task',
  'edit_task',
  'delete_task',
  'assign_task',
  'change_task_status',
  'view_profile',
  'edit_profile',
];

/**
 * UI capability matrix derived from Spec ID-2 and Decision D2 (no project deletion in MVP per D9).
 *
 * NOTE: The `'Team Member'` column reflects UNVERIFIED assumptions per Decision D6 (blocked on
 * Team Member credentials). Client gating controls UI affordances only; Laravel enforces authorization.
 */
export const ROLE_CAPABILITIES: Record<SystemRole, ReadonlySet<Capability>> = {
  Administrator: new Set<Capability>(ADMIN_AND_PM_CAPABILITIES),
  'Project Manager': new Set<Capability>(ADMIN_AND_PM_CAPABILITIES),
  // UNVERIFIED (D6): Team Member backend permissions remain unverified against the live API.
  'Team Member': new Set<Capability>([
    'view_dashboard',
    'view_projects',
    'view_tasks',
    'change_task_status',
    'view_profile',
    'edit_profile',
  ]),
};

function isSystemRole(role: string): role is SystemRole {
  return KNOWN_ROLES.has(role as SystemRole); // Type predicate narrows checked runtime string.
}

/** Extracts the primary verified system role from `UserResource.roles`. */
export function normalizeSystemRole(
  roles: readonly string[] | null | undefined,
): SystemRole | null {
  if (!roles || roles.length === 0) {
    return null;
  }

  for (const role of roles) {
    if (isSystemRole(role)) {
      return role;
    }
  }

  return null;
}

/** Checks whether the normalized role holds a single MVP capability (`false` when role is absent). */
export function hasCapability(
  role: SystemRole | null | undefined,
  capability: Capability,
): boolean {
  if (!role) {
    return false;
  }
  return ROLE_CAPABILITIES[role].has(capability);
}

/** Checks whether the normalized role holds at least one capability from `capabilities`. */
export function hasAnyCapability(
  role: SystemRole | null | undefined,
  capabilities: readonly Capability[],
): boolean {
  return capabilities.some((capability) => hasCapability(role, capability));
}
