/** Joins non-empty class name fragments without introducing duplicate whitespace. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ');
}
