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
    <main className="relative flex min-h-dvh items-center justify-center bg-canvas px-4 pb-10 pt-24">
      <p className="absolute left-4 top-8 font-wordmark text-xl font-normal text-ink sm:left-12 sm:top-12">
        CollabSpace
      </p>
      <div className="w-full max-w-[601px]">
        <Card variant="elevated" className="p-6 sm:p-16">
          <header className="mb-6 space-y-1.5 text-center">
            <h1 className="text-[31px] font-semibold text-heading">{title}</h1>
            <p className="text-base text-gray-500">{subtitle}</p>
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
