import { CircleStop } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getErrorMessage, isApiError } from '@/lib/errors';

import { useCancelAnalysis } from '../hooks/useAnalysis';

export const CANCEL_ANALYSIS_TITLE = 'Отменить анализ?';
export const CANCEL_ANALYSIS_TEXT =
  'Документ вернётся в статус «Черновик». Анализ можно будет запустить заново.';
const ALREADY_FINISHED = 'Анализ уже завершился, отменять нечего.';

interface CancelAnalysisButtonProps {
  projectId: string;
  document: { id: string; name: string; current_analysis_job_id?: string | null };
}

export function CancelAnalysisButton({ projectId, document }: CancelAnalysisButtonProps) {
  const cancel = useCancelAnalysis(projectId);
  const [open, setOpen] = useState(false);
  const jobId = document.current_analysis_job_id;

  const confirm = () => {
    if (!jobId) return;
    cancel.mutate(
      { documentId: document.id, jobId },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(`Анализ «${document.name}» отменён`);
        },
        onError: (error) => {
          if (isApiError(error) && error.status === 409) {
            setOpen(false);
            toast.info(ALREADY_FINISHED);
          }
        },
      },
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={!jobId}
        title={jobId ? undefined : 'Сервер не вернул текущую задачу анализа'}
        onClick={() => {
          cancel.reset();
          setOpen(true);
        }}
      >
        <CircleStop aria-hidden />
        Отменить анализ
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={CANCEL_ANALYSIS_TITLE}
        description={CANCEL_ANALYSIS_TEXT}
        confirmLabel="Отменить анализ"
        cancelLabel="Продолжить анализ"
        destructive
        loading={cancel.isPending}
        error={
          cancel.isError && !(isApiError(cancel.error) && cancel.error.status === 409)
            ? getErrorMessage(cancel.error)
            : null
        }
        onConfirm={confirm}
      />
    </>
  );
}
