import { Check, ChevronLeft, ChevronRight, Search, UserPlus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { getErrorMessage, toAppError, type UserResource } from '@/shared/api';
import { toSafeExternalUrl } from '@/shared/lib';
import { Avatar, BlockErrorState, Button, Field, Input, Skeleton, cn } from '@/shared/ui';
import { useUserSearchPicker } from '../hooks/useUserSearchPicker';
import type { ProjectMemberFormValue } from '../schemas/project.schemas';

export interface ProjectMemberPickerProps {
  value: readonly ProjectMemberFormValue[];
  onChange: (nextValue: ProjectMemberFormValue[]) => void;
  disabled?: boolean;
  error?: string;
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
  // Safe assignment for standard React ref objects alongside `useRef`.
  (ref as { current: T | null }).current = value;
}

function formatTriggerLabel(count: number): string {
  if (count === 0) {
    return 'Search and add project members (optional)';
  }
  const noun = count === 1 ? 'member' : 'members';
  return `${count} ${noun} selected`;
}

interface UserOptionRowProps {
  user: UserResource;
  isSelected: boolean;
  onSelect: (user: UserResource) => void;
}

function UserOptionRow({ user, isSelected, onSelect }: UserOptionRowProps) {
  const subtitle = user.job_title || null;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(user)}
      className={cn(
        'flex min-h-touch w-full items-center justify-between gap-3 px-2 py-2 text-left text-sm transition-colors hover:bg-surface-input cursor-pointer',
        isSelected && 'bg-surface-input',
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar name={user.name} src={toSafeExternalUrl(user.avatar_url)} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{user.name}</span>
          {subtitle ? <span className="block truncate text-xs text-body">{subtitle}</span> : null}
        </span>
      </span>
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
}

interface SelectedMemberRowProps {
  member: ProjectMemberFormValue;
  cachedUser: UserResource | undefined;
  disabled: boolean;
  onRoleChange: (userId: number, role: string) => void;
  onRemove: (userId: number) => void;
}

function SelectedMemberRow(props: SelectedMemberRowProps) {
  const { member, cachedUser, disabled, onRoleChange, onRemove } = props;
  const displayName = cachedUser?.name ?? `User #${member.user_id}`;

  return (
    <li className="flex flex-col gap-2 rounded-input border border-border-subtle bg-surface-input p-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={displayName} src={toSafeExternalUrl(cachedUser?.avatar_url)} size="xs" />
        <span className="truncate text-sm font-medium text-ink">{displayName}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          aria-label={`Project role for ${displayName}`}
          placeholder="Role (optional)"
          maxLength={100}
          disabled={disabled}
          value={member.role}
          onChange={(event) => onRoleChange(member.user_id, event.target.value)}
          className="min-h-touch w-full sm:w-40 rounded-input border border-border-input bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-body focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={`Remove ${displayName}`}
          onClick={() => onRemove(member.user_id)}
          className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-pill text-body hover:bg-danger-tint hover:text-danger cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

interface UserPickerListProps {
  isLoading: boolean;
  error: unknown;
  users: readonly UserResource[];
  selectedIds: ReadonlySet<number>;
  onRetry: () => void;
  onSelect: (user: UserResource) => void;
}

function UserPickerList(props: UserPickerListProps) {
  const { isLoading, error, users, selectedIds, onRetry, onSelect } = props;

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </div>
    );
  }

  if (error) {
    const errorMessage = getErrorMessage(toAppError(error));
    return <BlockErrorState message={errorMessage} onRetry={onRetry} />;
  }

  if (users.length === 0) {
    return <p className="py-4 text-center text-sm text-body">No matching users found.</p>;
  }

  return (
    <div
      role="listbox"
      aria-multiselectable="true"
      aria-label="Available users"
      className="divide-y divide-border-subtle"
    >
      {users.map((user) => (
        <UserOptionRow
          key={user.id}
          user={user}
          isSelected={selectedIds.has(user.id)}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/**
 * Create-only project member picker (`D5`, `M28`, `#users-index`):
 * loads `/users` with `per_page=20` only when opened, debounces search, and filters client-side.
 */
export function ProjectMemberPicker(props: ProjectMemberPickerProps) {
  const { value, onChange, disabled = false, error, triggerRef } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCache, setSelectedCache] = useState<Record<number, UserResource>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const localTriggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const picker = useUserSearchPicker({ enabled: isOpen, searchTerm });

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

  const selectedIds = new Set(value.map((member) => member.user_id));

  const toggleMember = (user: UserResource) => {
    if (selectedIds.has(user.id)) {
      onChange(value.filter((item) => item.user_id !== user.id));
      return;
    }

    setSelectedCache((prev) => ({ ...prev, [user.id]: user }));
    onChange([...value, { user_id: user.id, role: '' }]);
  };

  const updateMemberRole = (userId: number, role: string) => {
    onChange(value.map((item) => (item.user_id === userId ? { ...item, role } : item)));
  };

  const removeMember = (userId: number) => {
    onChange(value.filter((item) => item.user_id !== userId));
  };

  const handlePrevPage = () => {
    picker.setPage(Math.max(1, picker.currentPage - 1));
  };

  const handleNextPage = () => {
    picker.setPage(Math.min(picker.lastPage, picker.currentPage + 1));
  };

  const triggerLabel = formatTriggerLabel(value.length);
  const triggerTextClass = value.length > 0 ? 'text-ink' : 'text-body';
  const actionLabel = isOpen ? 'Done' : 'Add +';
  const pageSummary = `Page ${picker.currentPage} of ${picker.lastPage}`;

  return (
    <Field label="Add Members" labelVariant="top" error={error}>
      {(a11yProps) => (
        <div ref={containerRef} className="space-y-3">
          <div className="relative">
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
                error ? 'border-danger' : 'border-border-input focus:border-primary',
              )}
            >
              <span className="flex items-center gap-2 text-body">
                <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={triggerTextClass}>{triggerLabel}</span>
              </span>
              <span className="rounded-pill bg-dark px-3 py-1 text-xs font-medium text-surface">
                {actionLabel}
              </span>
            </button>

            {isOpen ? (
              <div
                id={panelId}
                className="mt-2 rounded-card border border-border-subtle bg-surface p-3 shadow-popover space-y-3"
              >
                <Input
                  label="Search users"
                  labelVariant="sr-only"
                  shape="pill"
                  type="search"
                  placeholder="Search people by name or email..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
                />

                <div className="max-h-56 overflow-y-auto">
                  <UserPickerList
                    isLoading={picker.isLoading}
                    error={picker.error}
                    users={picker.users}
                    selectedIds={selectedIds}
                    onRetry={() => void picker.refetch()}
                    onSelect={toggleMember}
                  />
                </div>

                {picker.lastPage > 1 ? (
                  <div className="flex items-center justify-between border-t border-border-subtle pt-2 text-xs text-body">
                    <span>{pageSummary}</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={picker.currentPage <= 1 || picker.isFetching}
                        onClick={handlePrevPage}
                        aria-label="Previous users page"
                        iconOnly
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={picker.currentPage >= picker.lastPage || picker.isFetching}
                        onClick={handleNextPage}
                        aria-label="Next users page"
                        iconOnly
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {value.length > 0 ? (
            <ul className="space-y-2" aria-label="Selected project members">
              {value.map((member) => (
                <SelectedMemberRow
                  key={member.user_id}
                  member={member}
                  cachedUser={selectedCache[member.user_id]}
                  disabled={disabled}
                  onRoleChange={updateMemberRole}
                  onRemove={removeMember}
                />
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </Field>
  );
}
