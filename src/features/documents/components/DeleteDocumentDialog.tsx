import { useEffect } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getErrorMessage } from '@/lib/errors';

import { useDeleteDocument } from '../hooks/useDocuments';

export const DELETE_DOCUMENT_TEXT =
  'Вместе с документом будут удалены его специфичные источники, предложения ИИ и результаты обработки. Отменить это действие будет невозможно.';

export interface DocumentToDelete {
  id: string;
  name: string;
  projectId: string;
}

interface DeleteDocumentDialogProps {
  document: DocumentToDelete | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteDocumentDialog({ document, onOpenChange }: DeleteDocumentDialogProps) {
  const remove = useDeleteDocument();
  const resetMutation = remove.reset;

  useEffect(() => {
    if (document) resetMutation();
  }, [document, resetMutation]);

  return (
    <ConfirmDialog
      open={document !== null}
      onOpenChange={onOpenChange}
      title="Удалить документ?"
      description={DELETE_DOCUMENT_TEXT}
      confirmLabel="Удалить"
      destructive
      loading={remove.isPending}
      error={remove.error ? getErrorMessage(remove.error) : null}
      onConfirm={() => {
        if (!document) return;
        remove.mutate(
          { projectId: document.projectId, documentId: document.id },
          {
            onSuccess: () => {
              toast.success(`Документ «${document.name}» удалён`);
              onOpenChange(false);
            },
          },
        );
      }}
    />
  );
}
