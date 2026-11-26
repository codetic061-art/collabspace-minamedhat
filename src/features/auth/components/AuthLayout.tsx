import type { ReactNode } from 'react';
import { Card } from '@/shared/ui';

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared centered Figma auth card (`1:10523`, `1:10573`, §12.2–§12.5) without third-party auth chrome. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="font-wordmark text-2xl font-normal tracking-tight text-primary">
            CollabSpace
          </p>
        </div>

        <Card variant="elevated" className="p-6 sm:p-8">
          <header className="mb-6 space-y-1.5 text-center">
            <h1 className="text-2xl font-bold text-ink">{title}</h1>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </header>

          {children}

          {footer ? (
            <div className="mt-6 border-t border-border-subtle pt-4 text-center text-sm text-gray-500">
              {footer}
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
