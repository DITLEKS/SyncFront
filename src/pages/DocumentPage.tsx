import { ChevronRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state';
import { documentPolicy } from '@/domain/document/status';
import {
  DocumentStatusBadge,
  LOCKED_SOURCES_TEXT,
  DocumentStatusPanel,
  useDocumentDetail,
  useTrackDocumentOpen,
} from '@/features/documents';
import { useProjectDetail } from '@/features/projects';
import { ProjectSourceEditor, SourceList } from '@/features/sources';
import { getErrorMessage, isApiError } from '@/lib/errors';
import { formatBytes, formatDate } from '@/lib/format';

import { NotFoundPage } from './NotFoundPage';

/** Страница документа до редактора: статус, анализ и источники. Редактор — шаг 4. */
export function DocumentPage() {
  const { projectId = '', documentId = '' } = useParams();
  const document = useDocumentDetail(projectId, documentId);
  const project = useProjectDetail(projectId);
  useTrackDocumentOpen(projectId, documentId, document.isSuccess);

  if (document.isPending) {
    return (
      <div className="space-y-4" aria-label="Загрузка документа">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-10 w-96 max-w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (document.isError) {
    if (isApiError(document.error) && document.error.status === 404) return <NotFoundPage />;
    return (
      <ErrorState
        message={getErrorMessage(document.error)}
        onRetry={() => void document.refetch()}
      />
    );
  }

  const doc = document.data;
  const projectName = project.data?.name;
  const baseSources = project.data?.sources ?? [];
  const specific = project.data?.documents?.find((d) => d.id === doc.id)?.sources ?? [];

  return (
    <>
      <nav
        aria-label="Навигационная цепочка"
        className="mb-4 flex min-w-0 items-center gap-1 text-sm text-muted-foreground"
      >
        <Link to="/projects" className="hover:text-foreground hover:underline">
          Проекты
        </Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
        <Link
          to={`/projects/${projectId}`}
          className="truncate hover:text-foreground hover:underline"
        >
          {projectName ?? 'Проект'}
        </Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
        <span aria-current="page" className="truncate text-foreground">
          {doc.name}
        </span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight">{doc.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {doc.format.toUpperCase()} · {formatBytes(doc.size_bytes)} · загружен{' '}
            {formatDate(doc.uploaded_at)}
          </p>
        </div>
        <DocumentStatusBadge status={doc.status} />
      </header>

      <div className="space-y-8">
        <DocumentStatusPanel projectId={projectId} document={doc} />

        <section aria-labelledby="document-sources-title" className="space-y-3">
          <h2 id="document-sources-title" className="text-base font-semibold">
            Источники
          </h2>
          {project.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : project.isError ? (
            <ErrorState
              message={getErrorMessage(project.error)}
              onRetry={() => void project.refetch()}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Базовые источники проекта
                </h3>
                {baseSources.length > 0 ? (
                  <SourceList items={baseSources} />
                ) : (
                  <p className="text-sm text-muted-foreground">Базовых источников нет.</p>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Специфичные источники
                </h3>
                <ProjectSourceEditor
                  projectId={projectId}
                  target={{ scope: 'document', documentId: doc.id }}
                  items={specific}
                  lockedReason={
                    documentPolicy.canEditSources(doc.status) ? undefined : LOCKED_SOURCES_TEXT
                  }
                  emptyText="Для документа не добавлено специфичных источников."
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
