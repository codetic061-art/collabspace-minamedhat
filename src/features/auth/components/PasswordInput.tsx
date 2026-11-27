import { useState, type Ref } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input, type InputProps } from '@/shared/ui';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'trailingAdornment'> {
  ref?: Ref<HTMLInputElement>;
}

/** Password field with keyboard-accessible show/hide toggle matching Figma auth inputs. */
export function PasswordInput({ leadingIcon, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <Input
      type={isVisible ? 'text' : 'password'}
      leadingIcon={leadingIcon ?? <Lock className="h-4 w-4" aria-hidden="true" />}
      trailingAdornment={
        <button
          type="button"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((prev) => !prev)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-input text-gray-500 hover:bg-surface-label hover:text-ink focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      }
      {...props}
    />
  );
}
