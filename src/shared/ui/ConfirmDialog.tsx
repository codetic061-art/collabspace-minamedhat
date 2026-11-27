import { useRef } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

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
      description={description}
      children={null}
      size="sm"
      isSubmitting={isConfirming}
      submittingLabel={confirmingLabel}
      initialFocusRef={cancelButtonRef}
      footer={
        <>
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            disabled={isConfirming}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            isLoading={isConfirming}
            loadingText={confirmingLabel}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
