export type TaskStatus = 'Pending' | 'In Progress' | 'In Review' | 'Completed';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ProjectStatus = 'Pending' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type UserAccountStatus = 'active' | 'inactive' | string;

export type AvailabilityStatus = 'available' | 'busy' | 'away' | 'offline';

export type TeamRole =
  | 'Team Lead'
  | 'Tech Lead'
  | 'Product Owner'
  | 'Scrum Master'
  | 'Backend Developer'
  | 'Frontend Developer'
  | 'Mobile Developer'
  | 'Full-Stack Developer'
  | 'UI/UX Designer'
  | 'QA Engineer'
  | 'DevOps Engineer'
  | 'Data Engineer'
  | 'AI/ML Engineer'
  | 'Security Engineer'
  | 'Business Analyst'
  | 'Support Engineer'
  | 'Mentor'
  | 'Intern'
  | 'Member';

export type AuditLogCategory = 'auth' | 'project' | 'task' | 'file' | 'chat' | 'meeting' | 'ai';

export interface EntityRef {
  id: number;
  name: string;
}

export interface CreatorRef {
  id: number;
  name: string;
  email: string;
}

export interface AssigneeRef {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  job_title: string | null;
}

/** Verified user resource returned across auth, profile, and users endpoints (`docs/api/plain.md`). */
export interface UserResource {
  id: number;
  name: string;
  email: string;
  job_title: string | null;
  about: string | null;
  years_of_experience: number;
  phone: string | null;
  avatar_url: string | null;
  status: UserAccountStatus;
  available_status: AvailabilityStatus;
  current_project_id: number | null;
  current_project?: EntityRef | null;
  roles: string[];
  permissions: readonly unknown[]; // UNVERIFIED item type (`[]` observed live).
  google_linked: boolean;
  facebook_linked: boolean;
  linkedin_linked: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Verified list item returned inside `GET /projects` (`P1`). */
export interface ProjectListItem {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  deadline: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress_percentage: number;
  files_count: number;
  teams: EntityRef[];
  created_at: string;
}

export interface ProjectSummaryTeam {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  members_count: number;
  active_projects_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectDirectMember {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  job_title: string | null;
  role: string;
}

/** Verified project detail payload (`GET /projects/{project}`, `POST /projects`, `PUT /projects/{project}`). */
export interface ProjectOverviewResource {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress_percentage: number;
  due_date_indicator: {
    start_date: string;
    deadline: string;
    total_days: number;
    days_remaining: number;
    is_overdue: boolean;
  };
  tasks_statistics: {
    total: number;
    pending: number;
    in_progress: number;
    in_review: number;
    completed: number;
    completion_rate: number;
    pending_percentage: number;
    in_progress_percentage: number;
    in_review_percentage: number;
    completed_percentage: number;
  };
  counts: {
    files: number;
    meetings: number;
    messages: number;
    teams: number;
    direct_members: number;
  };
  teams: ProjectSummaryTeam[];
  direct_members: ProjectDirectMember[];
  created_by: number;
  creator: CreatorRef;
  created_at: string;
  updated_at: string;
}

/** Verified task resource (`GET /tasks`, `GET /tasks/{task}`, `GET /projects/{project}/tasks/kanban`). */
export interface TaskResource {
  id: number;
  name: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  hours_spent: number;
  project_id: number;
  team_id: number | null;
  assigned_to: number | null;
  created_by: number;
  project: EntityRef;
  team: EntityRef | null;
  assignee: AssigneeRef | null;
  creator: CreatorRef;
  attachments_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberResource {
  id: number;
  name: string;
  email: string;
  job_title: string | null;
  avatar_url: string | null;
  role_in_team: TeamRole;
  is_leader: boolean;
  joined_at: string | null;
}

/** Verified team resource (`GET /teams`, `GET /teams/{team}`). */
export interface TeamResource {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  creator: CreatorRef;
  members_count: number;
  active_projects_count: number;
  members: TeamMemberResource[];
  created_at: string;
  updated_at: string;
}

/** Verified file attachment shape (`#files-index`, `#profile-files`). */
export interface FileAttachmentResource {
  id: number;
  name: string;
  file_path: string;
  file_size: number;
  file_size_formatted: string;
  mime_type: string | null;
  url: string;
  project_id: number | null;
  task_id: number | null;
  uploaded_by: string;
  uploaded_by_id: number;
  project: EntityRef | null;
  task: EntityRef | null;
  uploader: CreatorRef;
  created_at: string;
  updated_at: string;
}
