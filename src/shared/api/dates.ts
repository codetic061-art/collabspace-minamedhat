const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_ONLY_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export interface ParsedTime {
  hours: number;
  minutes: number;
  seconds: number;
}

const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const DISPLAY_DATETIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function createValidatedUtcDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Parses API calendar dates (`YYYY-MM-DD`) and timestamps (`ISO+offset` and `ISO-Z`).
 * For time-only strings (`HH:MM:SS`), returns `null` (use `parseApiTime`).
 */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number.parseInt(dateOnlyMatch[1] ?? '', 10);
    const month = Number.parseInt(dateOnlyMatch[2] ?? '', 10);
    const day = Number.parseInt(dateOnlyMatch[3] ?? '', 10);
    return createValidatedUtcDate(year, month, day);
  }

  if (ISO_DATETIME_PATTERN.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/** Parses API meeting time strings in `HH:MM:SS` (or `HH:MM`) format. */
export function parseApiTime(value: string | null | undefined): ParsedTime | null {
  if (!value) {
    return null;
  }

  const match = TIME_ONLY_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1] ?? '', 10);
  const minutes = Number.parseInt(match[2] ?? '', 10);
  const seconds = match[3] ? Number.parseInt(match[3], 10) : 0;

  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  return { hours, minutes, seconds };
}

/** Formats `YYYY-MM-DD`, `ISO+offset`, or `ISO-Z` as a concise display date (`Nov 26, 2026`). */
export function formatDisplayDate(
  value: string | null | undefined,
  fallback = '—',
): string {
  const parsed = parseApiDate(value);
  if (!parsed) {
    return fallback;
  }
  return DISPLAY_DATE_FORMATTER.format(parsed);
}

/** Formats `ISO+offset` or `ISO-Z` timestamps with calendar date and time. */
export function formatDisplayDateTime(
  value: string | null | undefined,
  fallback = '—',
): string {
  const parsed = parseApiDate(value);
  if (!parsed) {
    return fallback;
  }
  return DISPLAY_DATETIME_FORMATTER.format(parsed);
}

/** Formats `HH:MM:SS` API meeting times as 12-hour clock strings (`2:30 PM`). */
export function formatDisplayTime(
  value: string | null | undefined,
  fallback = '—',
): string {
  const parsed = parseApiTime(value);
  if (!parsed) {
    return fallback;
  }
  const period = parsed.hours >= 12 ? 'PM' : 'AM';
  const hour12 = parsed.hours % 12 || 12;
  return `${hour12}:${pad2(parsed.minutes)} ${period}`;
}

/** Serializes a `Date` or `YYYY-MM-DD`/`ISO` string to canonical `YYYY-MM-DD` API request format. */
export function toApiDateString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DATE_ONLY_PATTERN.test(trimmed)) {
      return parseApiDate(trimmed) ? trimmed : null;
    }
    const parsed = parseApiDate(trimmed);
    if (!parsed) {
      return null;
    }
    const year = parsed.getUTCFullYear();
    const month = pad2(parsed.getUTCMonth() + 1);
    const day = pad2(parsed.getUTCDate());
    return `${year}-${month}-${day}`;
  }

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

/** Serializes a parsed or `HH:MM`/`HH:MM:SS` time value to canonical `HH:MM:SS` API format. */
export function toApiTimeString(value: ParsedTime | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = typeof value === 'string' ? parseApiTime(value) : value;
  if (!parsed) {
    return null;
  }
  if (
    parsed.hours < 0 ||
    parsed.hours > 23 ||
    parsed.minutes < 0 ||
    parsed.minutes > 59 ||
    parsed.seconds < 0 ||
    parsed.seconds > 59
  ) {
    return null;
  }

  return `${pad2(parsed.hours)}:${pad2(parsed.minutes)}:${pad2(parsed.seconds)}`;
}
