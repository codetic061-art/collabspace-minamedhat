/**
 * Deterministic project accent colour (M20). The API has no colour field, so a stable
 * palette index is derived from the project id using the approved support palette
 * (violet, teal, orange, blue, green). The same id always yields the same accent.
 */
export const PROJECT_ACCENTS = ['violet', 'teal', 'orange', 'primary', 'success'] as const;

export type ProjectAccent = (typeof PROJECT_ACCENTS)[number];

export function projectAccent(projectId: number): ProjectAccent {
  if (!Number.isFinite(projectId) || projectId < 0) {
    return 'primary';
  }
  const index = Math.trunc(projectId) % PROJECT_ACCENTS.length;
  return PROJECT_ACCENTS[index] ?? 'primary';
}
