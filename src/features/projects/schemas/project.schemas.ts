import { z } from 'zod';
import type { CreateProjectPayload, UpdateProjectPayload } from '@/shared/api';
import { PROJECT_PRIORITIES, PROJECT_STATUSES } from '../utils/projectPresentation';

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const PROJECT_STATUS_TUPLE: [
  (typeof PROJECT_STATUSES)[number],
  ...(typeof PROJECT_STATUSES)[number][],
] = ['Pending', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];

const PROJECT_PRIORITY_TUPLE: [
  (typeof PROJECT_PRIORITIES)[number],
  ...(typeof PROJECT_PRIORITIES)[number][],
] = ['Low', 'Medium', 'High', 'Critical'];

export const projectMemberInputSchema = z.object({
  user_id: z.number().int().positive(),
  role: z.string().trim().max(100, 'Role must not exceed 100 characters.'),
});

const projectBaseFields = {
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required.')
    .max(255, 'Project name must not exceed 255 characters.'),
  description: z.string().max(5000, 'Description must not exceed 5000 characters.'),
  priority: z.enum(PROJECT_PRIORITY_TUPLE),
  status: z.enum(PROJECT_STATUS_TUPLE),
  start_date: z.string().regex(DATE_INPUT_PATTERN, 'Start date is required.'),
  deadline: z.string().regex(DATE_INPUT_PATTERN, 'Deadline is required.'),
  teams: z.array(z.number().int().positive()),
};

function hasValidDeadlineRange(values: { start_date: string; deadline: string }): boolean {
  if (!DATE_INPUT_PATTERN.test(values.start_date) || !DATE_INPUT_PATTERN.test(values.deadline)) {
    return true;
  }
  return values.deadline >= values.start_date;
}

const DEADLINE_ORDER_MESSAGE = 'Deadline must be on or after the start date.';

/** Zod schema for Create Project (`StoreProjectRequest`, M8, §12.6). */
export const projectCreateSchema = z
  .object({
    ...projectBaseFields,
    members: z.array(projectMemberInputSchema),
  })
  .refine(hasValidDeadlineRange, {
    path: ['deadline'],
    message: DEADLINE_ORDER_MESSAGE,
  });

/** Zod schema for Edit Project (`UpdateProjectRequest`, M8, §12.6 — excludes `members`). */
export const projectEditSchema = z
  .object({
    ...projectBaseFields,
  })
  .refine(hasValidDeadlineRange, {
    path: ['deadline'],
    message: DEADLINE_ORDER_MESSAGE,
  });

export type ProjectCreateFormValues = z.infer<typeof projectCreateSchema>;
export type ProjectEditFormValues = z.infer<typeof projectEditSchema>;
export type ProjectMemberFormValue = z.infer<typeof projectMemberInputSchema>;

/** Builds the exact `StoreProjectRequest` payload, omitting empty optional fields (ID-6). */
export function toCreateProjectPayload(values: ProjectCreateFormValues): CreateProjectPayload {
  const payload: CreateProjectPayload = {
    name: values.name.trim(),
    start_date: values.start_date,
    deadline: values.deadline,
    priority: values.priority,
    status: values.status,
  };

  const trimmedDescription = values.description.trim();
  if (trimmedDescription.length > 0) {
    payload.description = trimmedDescription;
  }

  if (values.teams.length > 0) {
    payload.teams = values.teams;
  }

  if (values.members.length > 0) {
    payload.members = values.members.map((member) => {
      const trimmedRole = member.role.trim();
      return trimmedRole.length > 0
        ? { user_id: member.user_id, role: trimmedRole }
        : { user_id: member.user_id };
    });
  }

  return payload;
}

/** Builds the exact `UpdateProjectRequest` payload (never includes `members`, M8, §12.6). */
export function toUpdateProjectPayload(values: ProjectEditFormValues): UpdateProjectPayload {
  const trimmedDescription = values.description.trim();
  return {
    name: values.name.trim(),
    description: trimmedDescription.length > 0 ? trimmedDescription : null,
    start_date: values.start_date,
    deadline: values.deadline,
    priority: values.priority,
    status: values.status,
    teams: values.teams,
  };
}
