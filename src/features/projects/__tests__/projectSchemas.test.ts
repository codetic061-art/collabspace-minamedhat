import { describe, expect, it } from 'vitest';
import {
  projectCreateSchema,
  projectEditSchema,
  toCreateProjectPayload,
  toUpdateProjectPayload,
} from '../schemas/project.schemas';
import {
  buildProjectMemberRoster,
  filterUsersByQuery,
  getProjectAccentTone,
} from '../utils/projectPresentation';

describe('Project schemas and presentation helpers (Layer 1)', () => {
  it('rejects a deadline earlier than start_date in both create and edit schemas', () => {
    const createResult = projectCreateSchema.safeParse({
      name: 'Alpha Launch',
      description: 'Core delivery',
      priority: 'High',
      status: 'Pending',
      start_date: '2026-12-10',
      deadline: '2026-12-01',
      teams: [1],
      members: [],
    });
    expect(createResult.success).toBe(false);
    if (!createResult.success) {
      expect(createResult.error.flatten().fieldErrors.deadline).toContain(
        'Deadline must be on or after the start date.',
      );
    }

    const editResult = projectEditSchema.safeParse({
      name: 'Alpha Launch',
      description: '',
      priority: 'Medium',
      status: 'In Progress',
      start_date: '2026-12-10',
      deadline: '2026-12-09',
      teams: [],
    });
    expect(editResult.success).toBe(false);
  });

  it('builds exact StoreProjectRequest and UpdateProjectRequest payloads', () => {
    const createPayload = toCreateProjectPayload({
      name: '  CollabSpace MVP  ',
      description: '   ',
      priority: 'Critical',
      status: 'In Progress',
      start_date: '2026-11-01',
      deadline: '2026-12-15',
      teams: [2, 5],
      members: [
        { user_id: 10, role: 'Tech Lead' },
        { user_id: 11, role: '   ' },
      ],
    });

    expect(createPayload).toEqual({
      name: 'CollabSpace MVP',
      start_date: '2026-11-01',
      deadline: '2026-12-15',
      priority: 'Critical',
      status: 'In Progress',
      teams: [2, 5],
      members: [{ user_id: 10, role: 'Tech Lead' }, { user_id: 11 }],
    });
    expect('description' in createPayload).toBe(false);

    const updatePayload = toUpdateProjectPayload({
      name: '  CollabSpace v1  ',
      description: '',
      priority: 'High',
      status: 'On Hold',
      start_date: '2026-11-01',
      deadline: '2026-12-20',
      teams: [],
    });

    expect(updatePayload).toEqual({
      name: 'CollabSpace v1',
      description: null,
      start_date: '2026-11-01',
      deadline: '2026-12-20',
      priority: 'High',
      status: 'On Hold',
      teams: [],
    });
    expect('members' in updatePayload).toBe(false);
  });

  it('deduplicates direct and team members while preserving Leader tags', () => {
    const roster = buildProjectMemberRoster(
      [
        {
          id: 1,
          name: 'Nora Salem',
          email: 'nora@example.test',
          avatar_url: null,
          job_title: 'Lead',
          role: 'Project Owner',
        },
        {
          id: 3,
          name: 'Tarek Adel',
          email: 'tarek@example.test',
          avatar_url: null,
          job_title: null,
          role: 'Stakeholder',
        },
      ],
      [
        {
          id: 10,
          name: 'Frontend',
          completion_percentage: 50,
          total_tasks: 4,
          completed_tasks: 2,
          members: [
            {
              id: 1,
              name: 'Nora Salem',
              avatar_url: null,
              role_in_team: 'Team Lead',
              is_leader: true,
              tasks_completed: 2,
              tasks_total: 4,
              tasks_ratio: '2/4',
              progress_percentage: 50,
            },
            {
              id: 2,
              name: 'Omar Hassan',
              avatar_url: null,
              role_in_team: 'Frontend Developer',
              is_leader: false,
              tasks_completed: 0,
              tasks_total: 0,
              tasks_ratio: '0/0',
              progress_percentage: 0,
            },
          ],
        },
      ],
      'all',
    );

    expect(roster).toHaveLength(3);
    expect(roster.find((m) => m.id === 1)).toMatchObject({
      isLeader: true,
      roleLabel: 'Team Lead',
    });
    expect(roster.find((m) => m.id === 3)).toMatchObject({
      isLeader: false,
      roleLabel: 'Stakeholder',
    });
  });

  it('assigns deterministic accent tones and applies client-side user fallback filter', () => {
    expect(getProjectAccentTone(1)).toBe(getProjectAccentTone(6));
    const users = [
      {
        id: 1,
        name: 'Maya Lin',
        email: 'maya@example.test',
        job_title: 'QA Engineer',
        about: null,
        years_of_experience: 3,
        phone: null,
        avatar_url: null,
        status: 'active',
        available_status: 'available' as const,
        current_project_id: null,
        roles: ['Team Member'],
        permissions: [],
        google_linked: false,
        facebook_linked: false,
        linkedin_linked: false,
        created_at: null,
        updated_at: null,
      },
      {
        id: 2,
        name: 'Samir Farid',
        email: 'samir@example.test',
        job_title: 'Backend Developer',
        about: null,
        years_of_experience: 4,
        phone: null,
        avatar_url: null,
        status: 'active',
        available_status: 'available' as const,
        current_project_id: null,
        roles: ['Project Manager'],
        permissions: [],
        google_linked: false,
        facebook_linked: false,
        linkedin_linked: false,
        created_at: null,
        updated_at: null,
      },
    ];

    expect(filterUsersByQuery(users, 'maya').map((u) => u.id)).toEqual([1]);
    expect(filterUsersByQuery(users, 'backend').map((u) => u.id)).toEqual([2]);
  });
});
