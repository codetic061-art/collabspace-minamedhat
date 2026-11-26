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

const NON_INERT_TAGS = new Set(['SCRIPT', 'STYLE', 'DIALOG']);

function isVisibleFocusable(node: Element): node is HTMLElement {
  if (!(node instanceof HTMLElement)) {
    return false;
  }
  if (node.hasAttribute('disabled') || node.closest('[hidden]')) {
    return false;
  }
  return node.getAttribute('aria-hidden') !== 'true';
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  return nodes.filter(isVisibleFocusable);
}

function isInertCandidate(child: Element, dialogEl: HTMLDialogElement): child is HTMLElement {
  if (!(child instanceof HTMLElement) || child === dialogEl) {
    return false;
  }
  if (child.hasAttribute('data-toast-region') || NON_INERT_TAGS.has(child.tagName)) {
    return false;
  }
  return !child.inert;
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

const DIALOG_LAYOUT_CLASSES = cn(
  'm-0 md:m-auto flex flex-col bg-surface text-ink shadow-modal',
  'backdrop:bg-ink/50 focus:outline-none',
  'h-dvh max-h-dvh w-screen max-w-none rounded-none',
  'md:h-auto md:max-h-dvh md:w-full md:rounded-modal',
);

const HEADER_CLASSES = cn(
  'flex items-start justify-between gap-4 border-b border-border-subtle',
  'px-5 py-4 md:px-modal md:pt-modal md:pb-4',
);

const FOOTER_CLASSES = cn(
  'sticky bottom-0 flex flex-col-reverse gap-3 border-t border-border-subtle',
  'bg-surface px-5 py-4 sm:flex-row sm:justify-end md:px-modal md:pb-modal',
);

interface ModalHeaderProps {
  titleId: string;
  descriptionId: string;
  title: string;
  description?: string;
  isSubmitting: boolean;
  onClose: () => void;
}

function ModalHeader({
  titleId,
  descriptionId,
  title,
  description,
  isSubmitting,
  onClose,
}: ModalHeaderProps) {
  return (
    <div className={HEADER_CLASSES}>
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
  );
}

/** Native `<dialog>` Top Layer modal with focus trap and background inerting (ID-23). */
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

    const active = document.activeElement;
    const previousFocus = active instanceof HTMLElement ? active : null;

    const inertedElements: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (isInertCandidate(child, dialogEl)) {
        child.inert = true;
        child.setAttribute('inert', '');
        inertedElements.push(child);
      }
    }

    if (!dialogEl.open) {
      dialogEl.showModal?.();
    }

    const firstEl = getFocusableElements(dialogEl)[0];
    const focusTarget = initialFocusRef?.current ?? firstEl ?? dialogEl;
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

    const active = document.activeElement;
    const atStart = active === first || active === dialogRef.current;
    if (event.shiftKey && atStart) {
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

  const dialogClass = cn(DIALOG_LAYOUT_CLASSES, MODAL_SIZE_CLASSES[size], className);

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
      className={dialogClass}
    >
      <ModalHeader
        titleId={titleId}
        descriptionId={descriptionId}
        title={title}
        description={description}
        isSubmitting={isSubmitting}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto px-5 py-5 md:px-modal">{children}</div>

      {footer ? <div className={FOOTER_CLASSES}>{footer}</div> : null}
    </dialog>,
    document.body,
  );
}
