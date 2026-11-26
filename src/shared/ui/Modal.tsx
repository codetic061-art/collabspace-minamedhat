import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement &&
      !node.hasAttribute('disabled') &&
      !node.closest('[hidden]') &&
      node.getAttribute('aria-hidden') !== 'true',
  );
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  isSubmitting?: boolean;
  size?: 'sm' | 'md' | 'lg';
  initialFocusRef?: RefObject<HTMLElement | null>;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

const MODAL_SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'md:max-w-md',
  md: 'md:max-w-xl',
  lg: 'md:max-w-2xl',
};

/** Native `<dialog>` Top Layer modal with focus trap, inert background, Escape suppression, and mobile full-screen sheet. */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  isSubmitting = false,
  size = 'md',
  initialFocusRef,
  footer,
  className,
  children,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialogEl = dialogRef.current;
    if (!dialogEl) {
      return;
    }

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const inertedElements: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (
        child instanceof HTMLElement &&
        child !== dialogEl &&
        !child.hasAttribute('data-toast-region') &&
        !['SCRIPT', 'STYLE', 'DIALOG'].includes(child.tagName) &&
        !child.inert
      ) {
        child.inert = true;
        child.setAttribute('inert', '');
        inertedElements.push(child);
      }
    }

    if (!dialogEl.open) {
      dialogEl.showModal?.();
    }

    const focusTarget = initialFocusRef?.current ?? getFocusableElements(dialogEl)[0] ?? dialogEl;
    focusTarget.focus();

    return () => {
      if (dialogEl.open) {
        dialogEl.close?.();
      }
      for (const el of inertedElements) {
        el.inert = false;
        el.removeAttribute('inert');
      }
      if (previousFocus && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [isOpen, initialFocusRef]);

  if (!isOpen) {
    return null;
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!isSubmitting) {
        onClose();
      }
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) {
      return;
    }

    const focusables = getFocusableElements(dialogRef.current);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (!first || !last) {
      event.preventDefault();
      return;
    }

    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === dialogRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current && !isSubmitting) {
      onClose();
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={handleKeyDown}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className={cn(
        'm-0 md:m-auto flex flex-col bg-surface text-ink shadow-modal backdrop:bg-ink/50 focus:outline-none',
        'h-dvh max-h-dvh w-screen max-w-none rounded-none',
        'md:h-auto md:max-h-dvh md:w-full md:rounded-modal',
        MODAL_SIZE_CLASSES[size],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4 md:px-modal md:pt-modal md:pb-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-xl md:text-2xl font-medium text-ink">{title}</h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm text-body">{description}</p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          iconOnly
          disabled={isSubmitting}
          aria-label="Close dialog"
          onClick={onClose}
          className="border-transparent bg-transparent hover:bg-surface-input shrink-0"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 md:px-modal">{children}</div>

      {footer ? (
        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-border-subtle bg-surface px-5 py-4 sm:flex-row sm:justify-end md:px-modal md:pb-modal">
          {footer}
        </div>
      ) : null}
    </dialog>,
    document.body,
  );
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmingLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
}

/** Destructive confirmation dialog placing initial focus safely on Cancel (ID-23). */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  confirmingLabel = 'Deleting...',
  cancelLabel = 'Cancel',
  isConfirming = false,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      isSubmitting={isConfirming}
      initialFocusRef={cancelButtonRef}
      footer={
        <>
          <Button
            ref={cancelButtonRef}
            variant="outline"
            disabled={isConfirming}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            isLoading={isConfirming}
            loadingText={confirmingLabel}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-heading">{description}</p>
    </Modal>
  );
}
