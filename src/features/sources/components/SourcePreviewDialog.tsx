import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';

import { queryKeys } from '@/api/queryKeys';
import { getSourceContent } from '@/api/resources/sources';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';

export interface PreviewableSource {
  id: string;
  name: string;
  type: 'url' | 'file';
  url?: string | null;
}

interface SourcePreviewDialogProps {
  projectId: string;
  source: PreviewableSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Источник на просмотр без редактирования: текст файла или, если текста нет, ссылка и причина. */
export function SourcePreviewDialog({
  projectId,
  source,
  open,
  onOpenChange,
}: SourcePreviewDialogProps) {
  const content = useQuery({
    queryKey: queryKeys.sources.content(projectId, source.id),
    queryFn: () => getSourceContent(projectId, source.id),
    enabled: open,
    staleTime: 10 * 60_000,
  });
  const addedAt = content.data?.created_at
    ? ` · добавлен ${formatDate(content.data.created_at)}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6" title={source.name}>
            {source.name}
          </DialogTitle>
          <DialogDescription>Источник истины, только просмотр{addedAt}.</DialogDescription>
        </DialogHeader>
        {content.isPending ? (
          <Skeleton className="h-48" aria-label="Загрузка источника" />
        ) : content.isError ? (
          <ErrorState
            message={getErrorMessage(content.error)}
            onRetry={() => void content.refetch()}
          />
        ) : content.data.preview_available && content.data.plain_text !== null ? (
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-3 font-sans text-sm">
            {content.data.plain_text}
          </pre>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{content.data.reason ?? 'Просмотр недоступен.'}</p>
            {content.data.url ? (
              <Button asChild variant="outline" size="sm">
                <a href={content.data.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden />
                  Открыть ссылку
                </a>
              </Button>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
