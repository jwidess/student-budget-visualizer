import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
  allowClose?: boolean;
  hideCancelButton?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  allowClose = true,
  hideCancelButton = false,
}: ConfirmDialogProps) {
  // Handle ESC key to close dialog
  useEffect(() => {
    if (!isOpen || !allowClose) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, allowClose, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={allowClose ? onCancel : undefined}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-2xl border border-border max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          {allowClose && (
            <button
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground rounded-md p-1 hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-gray-50">
          {!hideCancelButton && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-white hover:bg-accent hover:shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md hover:shadow-sm active:scale-95 transition-all cursor-pointer ${
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-400 text-white hover:bg-gray-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
