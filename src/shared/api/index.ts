export {
  ApiRequestError,
  getErrorMessage,
  isApiRequestError,
  parseRetryAfterHeader,
  toAppError,
  type AppError,
} from './errors';
export { applyServerValidationErrors } from './forms';
export {
  downloadBlob,
  requestAction,
  requestEnvelope,
  requestJson,
  triggerBlobDownload,
  type ApiEnvelopeWithMeta,
  type ApiMessageResult,
  type ApiSuccessEnvelope,
  type DownloadedFileResult,
  type DownloadBlobOptions,
  type HttpMethod,
  type QueryParamValue,
  type RequestOptions,
} from './httpClient';
export {
  normalizeP1,
  normalizeP2,
  normalizeP3,
  normalizeP4,
  type P1Collection,
  type P2Paginator,
  type P3Block,
  type P3PaginationMeta,
  type P4Meta,
  type P4Payload,
  type PaginatedResult,
  type PaginationLinkItem,
} from './pagination';
export {
  formatDisplayDate,
  formatDisplayDateTime,
  formatDisplayTime,
  parseApiDate,
  parseApiTime,
  toApiDateString,
  toApiTimeString,
  type ParsedTime,
} from './dates';
export { createAppQueryClient, getRetryDelay, shouldRetryQuery } from './queryConfig';
export type {
  AssigneeRef,
  AuditLogCategory,
  AvailabilityStatus,
  CreatorRef,
  EntityRef,
  FileAttachmentResource,
  ProjectDirectMember,
  ProjectListItem,
  ProjectOverviewResource,
  ProjectPriority,
  ProjectStatus,
  ProjectSummaryTeam,
  TaskPriority,
  TaskResource,
  TaskStatus,
  TeamMemberResource,
  TeamResource,
  TeamRole,
  UserAccountStatus,
  UserResource,
} from './types';

export * as authService from './services/auth.service';
export type {
  AuthSessionPayload,
  ForgotPasswordRequest,
  ForgotPasswordResult,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyResetOtpRequest,
} from './services/auth.service';

export * as profileService from './services/profile.service';
export { profileKeys, profileQueries } from './services/profile.service';
export type {
  ChangePasswordPayload,
  ProfileMeData,
  ProfileRawProject,
  ProfileRawTask,
  ProfileRawTeam,
  ProfileRecentActivity,
  ProfileTasksParams,
  UpdateProfilePayload,
} from './services/profile.service';

export * as dashboardService from './services/dashboard.service';
export { dashboardKeys, dashboardQueries } from './services/dashboard.service';
export type {
  DashboardActiveProjectItem,
  DashboardActivityItem,
  DashboardData,
  DashboardFileItem,
  DashboardMeetingItem,
  DashboardPeriod,
  DashboardProjectChartPoint,
  DashboardQueryParams,
  DashboardTaskItem,
  DashboardTaskPriority,
  DashboardTaskStatus,
  DashboardTeamItem,
} from './services/dashboard.service';

export * as projectsService from './services/projects.service';
export { projectsKeys, projectsQueries } from './services/projects.service';
export type {
  AssignProjectTeamsPayload,
  CreateProjectPayload,
  ListProjectsParams,
  ProjectOverviewChartPoint,
  ProjectOverviewParams,
  ProjectOverviewPeriod,
  ProjectOverviewWithChart,
  ProjectTeamMemberProgress,
  ProjectTeamProgress,
  StoreProjectMemberInput,
  UpdateProjectPayload,
} from './services/projects.service';

export * as tasksService from './services/tasks.service';
export {
  KANBAN_STATUS_ORDER,
  moveKanbanTaskOptimistically,
  tasksKeys,
  tasksQueries,
} from './services/tasks.service';
export type {
  AssignTaskPayload,
  CreateTaskPayload,
  KanbanBoardData,
  KanbanColumn,
  ListTasksParams,
  UpdateTaskPayload,
  UpdateTaskStatusPayload,
} from './services/tasks.service';

export * as teamsService from './services/teams.service';
export { teamsKeys, teamsQueries } from './services/teams.service';
export type { ListTeamsParams, TeamRoleOption, TeamRolesPayload } from './services/teams.service';

export * as usersService from './services/users.service';
export { usersKeys, usersQueries } from './services/users.service';
export type { ListUsersParams } from './services/users.service';
