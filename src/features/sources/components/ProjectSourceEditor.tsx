import { toast } from 'sonner';

import type { SourceTarget } from '@/api/resources/sources';
import { getErrorMessage } from '@/lib/errors';

import { useCreateSource, useDeleteSource } from '../hooks/useSourceMutations';

import { SourceDraftForm } from './SourceDraftForm';
import { SourceList, type SourceListItem } from './SourceList';

interface ProjectSourceEditorProps {
  projectId: string;
  target: SourceTarget;
  items: SourceListItem[];
  /** Если задано — источники только просматриваются (документ на анализе или ревью). */
  lockedReason?: string;
  emptyText: string;
  showForm?: boolean;
}

/** Источники уже созданного проекта или документа: каждое действие сразу уходит на сервер. */
export function ProjectSourceEditor({
  projectId,
  target,
  items,
  lockedReason,
  emptyText,
  showForm = true,
}: ProjectSourceEditorProps) {
  const create = useCreateSource(projectId, target);
  const remove = useDeleteSource(projectId);

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <SourceList
          items={items}
          lockedReason={lockedReason}
          removingId={remove.isPending ? remove.variables : null}
          onRemove={(item) =>
            remove.mutate(item.id, {
              onSuccess: () => toast.success(`Источник «${item.name}» удалён`),
              onError: (error) => toast.error(getErrorMessage(error)),
            })
          }
        />
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
      {showForm && !lockedReason ? (
        <div className="rounded-md border border-dashed p-3">
          <SourceDraftForm
            onSubmit={async (draft) => {
              try {
                await create.mutateAsync(draft);
                toast.success(`Источник «${draft.name}» добавлен`);
                return true;
              } catch (error) {
                toast.error(getErrorMessage(error));
                return false;
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
