import { Check, ChevronDown, Users } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { toAppError, getErrorMessage, type TeamResource } from '@/shared/api';
import { Badge, BlockErrorState, Field, Skeleton, cn } from '@/shared/ui';

export interface ProjectTeamsSelectProps {
  selectedIds: readonly number[];
  onChange: (nextIds: number[]) => void;
  teams: readonly TeamResource[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  disabled?: boolean;
  fieldError?: string;
}

/** Multi-select teams dropdown matching Figma's green-check dropdown pattern (§12.6). */
export function ProjectTeamsSelect({
  selectedIds,
  onChange,
  teams,
  isLoading,
  error,
  onRetry,
  disabled = false,
  fieldError,
}: ProjectTeamsSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const selectedSet = new Set(selectedIds);
  const selectedTeams = teams.filter((team) => selectedSet.has(team.id));

  const toggleTeam = (teamId: number) => {
    if (selectedSet.has(teamId)) {
      onChange(selectedIds.filter((id) => id !== teamId));
    } else {
      onChange([...selectedIds, teamId]);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  const summaryLabel =
    selectedIds.length === 0
      ? 'Select teams (optional)'
      : selectedTeams.length > 0
        ? selectedTeams.map((team) => team.name).join(', ')
        : `${selectedIds.length} ${selectedIds.length === 1 ? 'team' : 'teams'} selected`;

  return (
    <Field label="Teams" labelVariant="top" error={fieldError}>
      {(a11yProps) => (
        <div ref={containerRef} className="relative space-y-2" onKeyDown={handleKeyDown}>
          <button
            ref={triggerRef}
            id={a11yProps.id}
            type="button"
            disabled={disabled}
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            aria-invalid={a11yProps['aria-invalid']}
            aria-describedby={a11yProps['aria-describedby']}
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(
              'flex min-h-touch w-full items-center justify-between gap-2 rounded-input border bg-surface-input px-3.5 py-2 text-left text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
              fieldError ? 'border-danger' : 'border-border-input focus:border-primary',
            )}
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              <Users className="h-4 w-4 shrink-0 text-body" aria-hidden="true" />
              <span className={cn('truncate', selectedIds.length > 0 ? 'text-ink' : 'text-body')}>
                {summaryLabel}
              </span>
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-body transition-transform motion-reduce:transition-none',
                isOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>

          {selectedTeams.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedTeams.map((team) => (
                <Badge key={team.id} variant="primary">
                  {team.name}
                </Badge>
              ))}
            </div>
          ) : null}

          {isOpen ? (
            <div
              id={listboxId}
              role="listbox"
              aria-multiselectable="true"
              aria-label="Available teams"
              className="absolute left-0 z-30 mt-1 max-h-60 w-full overflow-auto rounded-card border border-border-subtle bg-surface py-1 shadow-popover divide-y divide-border-subtle"
            >
              {isLoading ? (
                <div className="space-y-2 p-3">
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                </div>
              ) : error ? (
                <div className="p-2">
                  <BlockErrorState message={getErrorMessage(toAppError(error))} onRetry={onRetry} />
                </div>
              ) : teams.length === 0 ? (
                <p className="px-4 py-3 text-sm text-body">No teams available.</p>
              ) : (
                teams.map((team) => {
                  const isSelected = selectedSet.has(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => toggleTeam(team.id)}
                      className={cn(
                        'flex min-h-touch w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-input cursor-pointer',
                        isSelected ? 'bg-surface-input font-medium text-ink' : 'text-heading',
                      )}
                    >
                      <span className="truncate">{team.name}</span>
                      {isSelected ? (
                        <span
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-success text-surface"
                          aria-hidden="true"
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      )}
    </Field>
  );
}
