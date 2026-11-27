import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const NON_INERT_TAGS = new Set(['SCRIPT', 'STYLE', 'DIALOG']);

// Keep a process-local stack so nested dialogs do not compete for keyboard or
// focus events. The most recently opened dialog owns the top layer.
const openDialogs: HTMLDialogElement[] = [];

function registerDialog(dialog: HTMLDialogElement): () => void {
  openDialogs.push(dialog);

  return () => {
    const index = openDialogs.lastIndexOf(dialog);
    if (index >= 0) {
      openDialogs.splice(index, 1);
    }
  };
}

function isTopmostDialog(dialog: HTMLDialogElement): boolean {
  return openDialogs[openDialogs.length - 1] === dialog;
}

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

function handleTabTrap(event: globalThis.KeyboardEvent, dialogEl: HTMLDialogElement) {
  const focusables = getFocusableElements(dialogEl);
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (!first || !last) {
    event.preventDefault();
    dialogEl.focus();
    return;
  }

  const active = document.activeElement;
  if (!active || !dialogEl.contains(active) || active === dialogEl) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
    return;
  }

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
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
}: UseModalDialogOptions): RefObject<HTMLDialogElement | null> {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const latestRef = useRef({ isSubmitting, onClose });

  useEffect(() => {
    latestRef.current = { isSubmitting, onClose };
  });

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
    const unregisterDialog = registerDialog(dialogEl);

    if (!dialogEl.open) {
      dialogEl.showModal?.();
    }

    const firstEl = getFocusableElements(dialogEl)[0];
    const focusTarget = initialFocusRef?.current ?? firstEl ?? dialogEl;
    focusTarget.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isTopmostDialog(dialogEl)) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (!latestRef.current.isSubmitting) {
          latestRef.current.onClose();
        }
        return;
      }

      if (event.key === 'Tab') {
        handleTabTrap(event, dialogEl);
      }
    };

    const onCancel = (event: Event) => {
      if (!isTopmostDialog(dialogEl)) {
        return;
      }

      event.preventDefault();
      if (!latestRef.current.isSubmitting) {
        latestRef.current.onClose();
      }
    };

    const onClick = (event: globalThis.MouseEvent) => {
      if (!isTopmostDialog(dialogEl)) {
        return;
      }

      if (event.target === dialogEl && !latestRef.current.isSubmitting) {
        latestRef.current.onClose();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isTopmostDialog(dialogEl)) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement) {
        const insideDialog = dialogEl.contains(target);
        const insideToast = Boolean(target.closest('[data-toast-region]'));
        if (!insideDialog && !insideToast) {
          const fallbackTarget = getFocusableElements(dialogEl)[0] ?? dialogEl;
          fallbackTarget.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    dialogEl.addEventListener('cancel', onCancel);
    dialogEl.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      dialogEl.removeEventListener('cancel', onCancel);
      dialogEl.removeEventListener('click', onClick);
      unregisterDialog();
      if (dialogEl.open) {
        dialogEl.close?.();
      }
      restoreInert();
      if (previousFocus && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [isOpen, initialFocusRef]);

  useEffect(() => {
    if (!isOpen || !isSubmitting) {
      return;
    }

    const dialogEl = dialogRef.current;
    if (!dialogEl) {
      return;
    }

    const active = document.activeElement;
    const isDisabledActive = active instanceof HTMLElement && active.hasAttribute('disabled');
    if (!active || !dialogEl.contains(active) || isDisabledActive) {
      dialogEl.focus();
    }
  }, [isOpen, isSubmitting]);

  return dialogRef;
}
