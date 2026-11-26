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
