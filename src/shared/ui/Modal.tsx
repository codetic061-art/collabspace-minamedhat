import { useId, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ModalHeader } from './ModalHeader';
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

const FOOTER_CLASSES = cn(
  'sticky bottom-0 flex flex-col-reverse gap-3 border-t border-border-subtle',
  'bg-surface px-5 py-4 sm:flex-row sm:justify-end md:px-modal md:pb-modal',
);

const BODY_CLASSES = 'flex-1 overflow-y-auto px-5 py-5 md:px-modal';

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
  const modal = useModalDialog({
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

  return createPortal(
    <dialog
      ref={modal.dialogRef}
      tabIndex={-1}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      onKeyDown={modal.handleKeyDown}
      onCancel={modal.handleCancel}
      onClick={modal.handleBackdropClick}
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
    </dialog>,
    document.body,
  );
}
