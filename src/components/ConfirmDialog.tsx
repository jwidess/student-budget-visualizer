import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
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
  hideCancelButton = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" />
        <div className="fixed inset-0 z-[201] grid place-items-center overflow-y-auto">
          <Dialog.Content className="dialog-content max-w-md w-[calc(100%-2rem)] rounded-lg border border-border bg-white shadow-2xl">
            <div className={`relative px-6 py-4 border-b border-border ${
              variant === 'danger' ? 'bg-red-50 border-b-red-200' : ''
            }`}>
              <Dialog.Title className={`text-lg font-semibold pr-8 ${
                variant === 'danger' ? 'text-red-700' : ''
              }`}>
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="absolute top-1/2 right-4 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <div className="px-6 py-4">
              <Dialog.Description className="text-sm text-muted-foreground">
                {message}
              </Dialog.Description>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-gray-50 rounded-b-lg">
              {!hideCancelButton && (
                <Dialog.Close asChild>
                  <button
                    className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-white hover:bg-accent hover:shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    {cancelLabel}
                  </button>
                </Dialog.Close>
              )}
              <button
                onClick={() => { onConfirm(); onCancel(); }}
                className={`px-4 py-2 text-sm font-medium rounded-md hover:shadow-sm active:scale-95 transition-all cursor-pointer ${
                  variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
