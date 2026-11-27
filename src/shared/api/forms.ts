import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { getErrorMessage, toAppError } from './errors';

/**
 * Maps `AppError` responses onto React Hook Form fields and `root.serverError` (ADR-08 §2).
 * Focuses the first known invalid field on 422 and preserves all entered form values.
 */
export function applyServerValidationErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  knownFields: readonly FieldPath<TFieldValues>[],
): void {
  const appError = toAppError(error);

  if (appError.kind === 'aborted') {
    return;
  }

  if (appError.kind !== 'validation') {
    setError('root.serverError', {
      type: 'server',
      message: getErrorMessage(appError),
    });
    return;
  }

  const knownFieldMap = new Map<string, FieldPath<TFieldValues>>(
    knownFields.map((field) => [String(field), field]),
  );

  const unknownMessages: string[] = [];
  let hasFocusedField = false;

  for (const [rawField, messages] of Object.entries(appError.errors)) {
    const firstMessage = messages[0];
    if (!firstMessage) {
      continue;
    }

    const matchedField = knownFieldMap.get(rawField);
    if (matchedField) {
      setError(
        matchedField,
        { type: 'server', message: firstMessage },
        { shouldFocus: !hasFocusedField },
      );
      hasFocusedField = true;
    } else {
      unknownMessages.push(firstMessage);
    }
  }

  if (unknownMessages.length > 0 || !hasFocusedField) {
    setError('root.serverError', {
      type: 'server',
      message: unknownMessages[0] ?? getErrorMessage(appError),
    });
  }
}
