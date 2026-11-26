import { useId, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from './cn';
import { useModalDialog } from './modalFocus';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  isSubmitting?: boolean;
  size?: ModalSize;
  initialFocusRef?: RefObject<HTMLElement | null>;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

const MODAL_SIZE_CLASSES: Record<ModalSize, string> = {
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

const TITLE_CLASSES = 'text-xl md:text-2xl font-medium text-ink';
const DESC_CLASSES = 'mt-1 text-sm text-body';
const BODY_CLASSES = 'flex-1 overflow-y-auto px-5 py-5 md:px-modal';
const CLOSE_CLASSES = 'border-transparent bg-transparent hover:bg-surface-input shrink-0';

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
        <h2 id={titleId} className={TITLE_CLASSES}>{title}</h2>
        {description ? <p id={descriptionId} className={DESC_CLASSES}>{description}</p> : null}
      </div>
      <Button
        variant="outline"
        size="sm"
        iconOnly
        type="button"
        disabled={isSubmitting}
        aria-label="Close dialog"
        onClick={onClose}
        className={CLOSE_CLASSES}
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
  const { dialogRef, handleKeyDown, handleCancel, handleBackdropClick } = useModalDialog({
    isOpen,
    isSubmitting,
    onClose,
    initialFocusRef,
  });

  if (!isOpen) {
    return null;
  }

  const dialogClass = cn(DIALOG_LAYOUT_CLASSES, MODAL_SIZE_CLASSES[size], className);
  const describedBy = description ? descriptionId : undefined;
  const footerNode = footer ? <div className={FOOTER_CLASSES}>{footer}</div> : null;

  const modalDialog = (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
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
      <div className={BODY_CLASSES}>{children}</div>
      {footerNode}
    </dialog>
  );

  return createPortal(modalDialog, document.body);
}
