import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from './cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  renderLink?: (label: string, className: string) => ReactNode;
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  className?: string;
}

/** Semantic breadcrumb navigation matching Figma muted-parent > active-ink hierarchy. */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          const linkClass = 'inline-flex min-h-touch items-center text-body hover:text-ink hover:underline';

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight className="h-4 w-4 text-body" aria-hidden="true" />
              ) : null}

              {isCurrent ? (
                <span aria-current="page" className="font-medium text-ink">
                  {item.label}
                </span>
              ) : item.renderLink ? (
                item.renderLink(item.label, linkClass)
              ) : item.href ? (
                <a href={item.href} className={linkClass}>
                  {item.label}
                </a>
              ) : item.onClick ? (
                <button type="button" onClick={item.onClick} className={cn(linkClass, 'cursor-pointer')}>
                  {item.label}
                </button>
              ) : (
                <span className="text-body">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
