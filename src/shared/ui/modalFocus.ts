import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
  type SyntheticEvent,
} from 'react';

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

/** Collects keyboard-focusable visible elements inside a modal container. */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  return nodes.filter(isVisibleFocusable);
}

/** Marks non-modal top-level body siblings `inert` and returns a restore callback. */
export function applyBackgroundInert(dialog: HTMLDialogElement): () => void {
  const inertedElements: HTMLElement[] = [];
  for (const child of Array.from(document.body.children)) {
    if (
      child instanceof HTMLElement &&
      child !== dialog &&
      !child.hasAttribute('data-toast-region') &&
      !NON_INERT_TAGS.has(child.tagName) &&
      !child.inert
    ) {
      child.inert = true;
      child.setAttribute('inert', '');
      inertedElements.push(child);
    }
  }

  return () => {
    for (const el of inertedElements) {
      el.inert = false;
      el.removeAttribute('inert');
    }
  };
}

export interface UseModalDialogOptions {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/** Encapsulates `<dialog>` Top Layer lifecycle, focus trap, Escape suppression, and focus return. */
export function useModalDialog({
  isOpen,
  isSubmitting,
  onClose,
  initialFocusRef,
}: UseModalDialogOptions) {
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
    const restoreInert = applyBackgroundInert(dialogEl);

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
      restoreInert();
      if (previousFocus && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [isOpen, initialFocusRef]);

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

  return {
    dialogRef,
    handleKeyDown,
    handleCancel,
    handleBackdropClick,
  };
}
