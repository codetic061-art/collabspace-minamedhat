import { useQuery } from '@tanstack/react-query';
import { teamsQueries } from '@/shared/api';

const TEAMS_PICKER_PAGE_SIZE = 100;

/** Loads available teams (`GET /teams`) only when the Project form modal is open (ID-18, §12.6). */
export function useTeamsPickerOptions(enabled: boolean) {
  return useQuery({
    ...teamsQueries.list({ page: 1, per_page: TEAMS_PICKER_PAGE_SIZE }),
    enabled,
  });
}
