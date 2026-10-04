import { useEffect } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getErrorMessage } from '@/lib/errors';

import { useDeleteProject } from '../hooks/useProjects';

interface DeleteProjectDialogProps {
  project: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export const DELETE_PROJECT_TEXT =
  'Вместе с проектом будут удалены все входящие в него документы, источники и результаты анализа. Отменить это действие будет невозможно.';

export function DeleteProjectDialog({
  project,
  onOpenChange,
  onDeleted,
}: DeleteProjectDialogProps) {
  const remove = useDeleteProject();
  const resetMutation = remove.reset;

  useEffect(() => {
    if (project) resetMutation();
  }, [project, resetMutation]);

  return (
    <ConfirmDialog
      open={project !== null}
      onOpenChange={onOpenChange}
      title="Удалить проект?"
      description={DELETE_PROJECT_TEXT}
      confirmLabel="Удалить"
      destructive
      loading={remove.isPending}
      error={remove.error ? getErrorMessage(remove.error) : null}
      onConfirm={() => {
        if (!project) return;
        remove.mutate(project.id, {
          onSuccess: () => {
            toast.success(`Проект «${project.name}» удалён`);
            onOpenChange(false);
            onDeleted?.();
          },
        });
      }}
    />
  );
}
