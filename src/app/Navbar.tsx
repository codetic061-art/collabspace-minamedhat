import { ChevronDown, LogOut, Menu, Settings, User, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useSession } from '@/features/auth';
import { toSafeExternalUrl } from '@/shared/lib';
import { Avatar, cn, DropdownMenu, type DropdownMenuItem } from '@/shared/ui';

interface PrimaryNavItem {
  to: string;
  label: string;
  end?: boolean;
}

const PRIMARY_NAV_ITEMS: readonly PrimaryNavItem[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projects', label: 'Projects' },
  { to: '/tasks', label: 'Tasks' },
];

/**
 * Authenticated MVP top bar (D7, §12.1, §12.9, §12.11):
 * renders wordmark, Dashboard/Projects/Tasks, user menu dropdown, and responsive drawer below 1024px.
 */
export function Navbar() {
  const { user, role, signOut } = useSession();
  const navigate = useNavigate();
  const drawerId = useId();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  const handleSignOut = async () => {
    setDrawerOpen(false);
    await signOut();
    navigate('/sign-in', { replace: true });
  };

  const displayName = user?.name ?? 'CollabSpace User';
  const displayRole = role ?? user?.roles[0] ?? 'Member';

  const menuItems: DropdownMenuItem[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="h-4 w-4" aria-hidden="true" />,
      onSelect: () => navigate('/profile'),
    },
    {
      id: 'edit-profile',
      label: 'Edit Profile',
      icon: <Settings className="h-4 w-4" aria-hidden="true" />,
      onSelect: () => navigate('/profile/settings'),
    },
    {
      id: 'sign-out',
      label: 'Sign out',
      tone: 'danger',
      icon: <LogOut className="h-4 w-4" aria-hidden="true" />,
      onSelect: () => void handleSignOut(),
    },
  ];

  return (
    <header className="relative sticky top-0 z-30 border-0 bg-surface after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-1 after:h-1 after:bg-[linear-gradient(180deg,rgba(9,30,66,0.13)_0%,rgba(9,30,66,0.13)_25%,rgba(9,30,66,0.08)_25.01%,rgba(9,30,66,0)_100%)]">
      <div className="flex h-navbar items-center justify-between gap-4 px-4 sm:px-6 lg:px-16">
        <div className="flex items-center gap-6">
          <button
            type="button"
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-input text-heading hover:bg-surface-label lg:hidden cursor-pointer"
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={drawerOpen}
            aria-controls={drawerId}
            onClick={() => setDrawerOpen((prev) => !prev)}
          >
            {drawerOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <Link
            to="/"
            className="font-wordmark text-xl font-normal tracking-tight text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            CollabSpace
          </Link>
        </div>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-[19px] rounded-pill bg-surface-input pl-1 pr-2 py-1 lg:flex"
        >
          {PRIMARY_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center justify-center rounded-pill p-2.5 text-xs font-normal transition-colors motion-reduce:transition-none',
                  isActive
                    ? 'bg-primary text-surface'
                    : 'text-heading hover:bg-surface-label hover:text-ink',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block">
          <DropdownMenu
            triggerLabel="User menu"
            align="end"
            header={
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-ink">{displayName}</p>
                <p className="text-xs text-gray-500">{displayRole}</p>
              </div>
            }
            trigger={(triggerProps) => (
              <button
                type="button"
                aria-label={`${displayName} ${displayRole} User menu`}
                className="flex min-h-touch items-center gap-2.5 rounded-pill border border-border-subtle bg-surface px-2.5 py-1 text-left transition-colors hover:bg-surface-input cursor-pointer"
                {...triggerProps}
              >
                <span aria-hidden="true">
                  <Avatar name={displayName} src={toSafeExternalUrl(user?.avatar_url)} size="sm" />
                </span>
                <span className="hidden xl:flex flex-col leading-tight">
                  <span className="text-sm font-medium text-ink">{displayName}</span>
                  {' '}
                  <span className="text-xs text-gray-500">{displayRole}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </button>
            )}
            items={menuItems}
          />
        </div>
      </div>

      {drawerOpen ? (
        <div className="border-t border-border-subtle bg-surface lg:hidden">
          <div id={drawerId} className="space-y-4 px-4 py-4">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-1.5">
              {PRIMARY_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-touch items-center rounded-pill px-4 text-sm font-medium',
                      isActive ? 'bg-primary text-surface' : 'text-heading hover:bg-surface-label',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-border-subtle pt-4">
              <div className="mb-3 flex items-center gap-3 px-2">
                <Avatar name={displayName} src={toSafeExternalUrl(user?.avatar_url)} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-ink">{displayName}</p>
                  <p className="text-xs text-gray-500">{displayRole}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Link
                  to="/profile"
                  onClick={() => setDrawerOpen(false)}
                  className="flex min-h-touch items-center gap-2 rounded-input px-3 text-sm text-heading hover:bg-surface-label"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/profile/settings"
                  onClick={() => setDrawerOpen(false)}
                  className="flex min-h-touch items-center gap-2 rounded-input px-3 text-sm text-heading hover:bg-surface-label"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  <span>Edit Profile</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="flex min-h-touch items-center gap-2 rounded-input px-3 text-left text-sm font-medium text-danger hover:bg-danger-tint cursor-pointer"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
