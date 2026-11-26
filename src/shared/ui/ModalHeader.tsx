import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalHeaderProps {
  titleId: string;
  descriptionId: string;
  title: string;
  description?: string;
  isSubmitting: boolean;
  onClose: () => void;
}

interface ModalDescriptionProps {
  id: string;
  description?: string;
}

const HEADER_CLASSES =
  'flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4 md:px-modal md:pt-modal md:pb-4';
const TITLE_CLASSES = 'text-xl md:text-2xl font-medium text-ink';
const DESC_CLASSES = 'mt-1 text-sm text-body';
const CLOSE_CLASSES = 'border-transparent bg-transparent hover:bg-surface-input shrink-0';

function ModalDescription({ id, description }: ModalDescriptionProps) {
  if (!description) {
    return null;
  }

  return <p id={id} className={DESC_CLASSES}>{description}</p>;
}

/** Header bar for `Modal` with title, optional description, and close control. */
export function ModalHeader({
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
        <ModalDescription id={descriptionId} description={description} />
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
