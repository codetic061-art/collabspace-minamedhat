import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/shared/ui';

const OTP_LENGTH = 6;
const DIGIT_INDICES = [0, 1, 2, 3, 4, 5] as const;

export interface OtpInputGroupProps {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  error?: string;
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, OTP_LENGTH);
}

/**
 * Six-digit numeric verification code input supporting single-digit entry,
 * multi-digit paste, Backspace cleanup, and arrow-key movement (§12.3, ID-21).
 */
export function OtpInputGroup({ value, onChange, disabled = false, error }: OtpInputGroupProps) {
  const groupId = useId();
  const errorId = `${groupId}-error`;
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = DIGIT_INDICES.map((index) => value.charAt(index));

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
  };

  const setDigitAt = (index: number, nextChar: string) => {
    const nextArray = [...digits];
    nextArray[index] = nextChar;
    onChange(nextArray.join(''));
  };

  const handleDigitChange = (index: number, raw: string) => {
    const clean = normalizeDigits(raw);
    if (!clean) {
      setDigitAt(index, '');
      return;
    }

    if (clean.length > 1) {
      onChange(clean);
      focusBox(Math.min(OTP_LENGTH - 1, clean.length - 1));
      return;
    }

    setDigitAt(index, clean);
    if (index < OTP_LENGTH - 1) {
      focusBox(index + 1);
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      if (digits[index]) {
        event.preventDefault();
        setDigitAt(index, '');
      } else if (index > 0) {
        event.preventDefault();
        setDigitAt(index - 1, '');
        focusBox(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusBox(index - 1);
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = normalizeDigits(event.clipboardData.getData('text'));
    if (!pasted) {
      return;
    }
    event.preventDefault();
    onChange(pasted);
    focusBox(Math.min(OTP_LENGTH - 1, pasted.length - 1));
  };

  return (
    <div className="space-y-2">
      <fieldset aria-describedby={error ? errorId : undefined} className="border-0 p-0 m-0">
        <legend className="mb-2 block text-sm font-semibold text-heading">Verification Code</legend>
        <div className="grid grid-cols-6 gap-2">
          {DIGIT_INDICES.map((index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              disabled={disabled}
              aria-label={`Verification code digit ${index + 1} of 6`}
              aria-invalid={error ? true : undefined}
              value={digits[index] ?? ''}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              className={cn(
                'h-12 w-full rounded-input border bg-surface-input text-center text-lg font-semibold text-ink transition-colors motion-reduce:transition-none focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
                error ? 'border-danger' : 'border-border-input',
              )}
            />
          ))}
        </div>
      </fieldset>

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
