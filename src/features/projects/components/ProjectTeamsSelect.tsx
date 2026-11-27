import { Check, ChevronDown, Users } from 'lucide-react';
import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { getErrorMessage, toAppError, type TeamResource } from '@/shared/api';
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
  triggerRef?: Ref<HTMLButtonElement>;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (!ref) {
    return;
  }
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  // Safe assignment for React RefObject alongside internal local ref.
  (ref as { current: T | null }).current = value;
}

function formatSummaryLabel(
  selectedIds: readonly number[],
  selectedTeams: readonly TeamResource[],
): string {
  if (selectedIds.length === 0) {
    return 'Select teams (optional)';
  }
  if (selectedTeams.length > 0) {
    return selectedTeams.map((team) => team.name).join(', ');
  }
  const noun = selectedIds.length === 1 ? 'team' : 'teams';
  return `${selectedIds.length} ${noun} selected`;
}

interface TeamsDropdownContentProps {
  isLoading: boolean;
  error: unknown;
  teams: readonly TeamResource[];
  selectedSet: ReadonlySet<number>;
  onRetry: () => void;
  onToggle: (teamId: number) => void;
}

function TeamsDropdownContent(props: TeamsDropdownContentProps) {
  const { isLoading, error, teams, selectedSet, onRetry, onToggle } = props;

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </div>
    );
  }

  if (error) {
    const errorMessage = getErrorMessage(toAppError(error));
    return (
      <div className="p-2">
        <BlockErrorState message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (teams.length === 0) {
    return <p className="px-4 py-3 text-sm text-body">No teams available.</p>;
  }

  return (
    <div
      role="listbox"
      aria-multiselectable="true"
      aria-label="Available teams"
      className="divide-y divide-border-subtle"
    >
      {teams.map((team) => {
        const isSelected = selectedSet.has(team.id);
        return (
          <button
            key={team.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onToggle(team.id)}
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
      })}
    </div>
  );
}

/** Multi-select teams dropdown matching Figma's green-check dropdown pattern (§12.6). */
export function ProjectTeamsSelect(props: ProjectTeamsSelectProps) {
  const {
    selectedIds,
    onChange,
    teams,
    isLoading,
    error,
    onRetry,
    disabled = false,
    fieldError,
    triggerRef,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const localTriggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsOpen(false);
        localTriggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [isOpen]);

  const selectedSet = new Set(selectedIds);
  const selectedTeams = teams.filter((team) => selectedSet.has(team.id));
  const summaryLabel = formatSummaryLabel(selectedIds, selectedTeams);

  const toggleTeam = (teamId: number) => {
    if (selectedSet.has(teamId)) {
      onChange(selectedIds.filter((id) => id !== teamId));
    } else {
      onChange([...selectedIds, teamId]);
    }
  };

  return (
    <Field label="Teams" labelVariant="top" error={fieldError}>
      {(a11yProps) => (
        <div ref={containerRef} className="relative space-y-2">
          <button
            ref={(node) => {
              localTriggerRef.current = node;
              assignRef(triggerRef, node);
            }}
            id={a11yProps.id}
            type="button"
            disabled={disabled}
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelId : undefined}
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
              id={panelId}
              className="absolute left-0 z-30 mt-1 max-h-60 w-full overflow-auto rounded-card border border-border-subtle bg-surface py-1 shadow-popover"
            >
              <TeamsDropdownContent
                isLoading={isLoading}
                error={error}
                teams={teams}
                selectedSet={selectedSet}
                onRetry={onRetry}
                onToggle={toggleTeam}
              />
            </div>
          ) : null}
        </div>
      )}
    </Field>
  );
}
