import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui';

export interface ProjectsPaginationProps {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  onPageChange: (nextPage: number) => void;
}

function buildPageNumbers(currentPage: number, lastPage: number): Array<number | 'ellipsis'> {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => index + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd = Math.min(lastPage - 1, currentPage + 1);

  if (windowStart > 2) {
    pages.push('ellipsis');
  }
  for (let p = windowStart; p <= windowEnd; p += 1) {
    pages.push(p);
  }
  if (windowEnd < lastPage - 1) {
    pages.push('ellipsis');
  }
  pages.push(lastPage);

  return pages;
}

/** Server-side pagination bar for All Projects (`P1`, ID-5). */
export function ProjectsPagination({
  currentPage,
  lastPage,
  perPage,
  total,
  onPageChange,
}: ProjectsPaginationProps) {
  if (total === 0) {
    return null;
  }

  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(total, currentPage * perPage);
  const pageItems = buildPageNumbers(currentPage, lastPage);

  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-body">
        Showing <span className="font-medium text-ink">{startItem}</span>–
        <span className="font-medium text-ink">{endItem}</span> of{' '}
        <span className="font-medium text-ink">{total}</span> projects
      </p>

      {lastPage > 1 ? (
        <nav aria-label="Projects pagination" className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
          >
            Previous
          </Button>

          {pageItems.map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-sm text-body" aria-hidden="true">
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === currentPage ? 'primary' : 'outline'}
                size="sm"
                aria-current={item === currentPage ? 'page' : undefined}
                aria-label={`Page ${item}`}
                onClick={() => onPageChange(item)}
                className="min-w-touch px-3"
              >
                {item}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= lastPage}
            onClick={() => onPageChange(currentPage + 1)}
            rightIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
