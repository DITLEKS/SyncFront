import { ChevronDown, Library, Loader2, Lock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { DocumentListItem, SourceResponse } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { documentPolicy } from '@/domain/document/status';
import { AnalysisProblem, StartAnalysisButton } from '@/features/analysis';
import { ProjectSourceEditor, SourceList } from '@/features/sources';
import { cn } from '@/lib/cn';
import { formatBytes, formatDate } from '@/lib/format';

import { DeleteDocumentDialog, type DocumentToDelete } from './DeleteDocumentDialog';
import { formatLabel } from '../model/format';

import { DocumentFormatIcon } from './DocumentFormatIcon';
import { DocumentStatusBadge } from './DocumentStatusBadge';

interface ProjectDocumentsListProps {
  projectId: string;
  documents: DocumentListItem[];
  baseSources: SourceResponse[];
}

const LOCKED_SOURCES =
  'Во время анализа и рассмотрения правок источники доступны только для просмотра';

/** Документы проекта; одновременно раскрыта не больше чем одна строка с источниками. */
export function ProjectDocumentsList({
  projectId,
  documents,
  baseSources,
}: ProjectDocumentsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DocumentToDelete | null>(null);

  return (
    <>
      <ul className="divide-y rounded-lg border bg-card">
        {documents.map((doc) => (
          <ProjectDocumentRow
            key={doc.id}
            projectId={projectId}
            document={doc}
            baseSources={baseSources}
            expanded={expandedId === doc.id}
            onToggle={() => setExpandedId((current) => (current === doc.id ? null : doc.id))}
            onDelete={() => setDeleting({ id: doc.id, name: doc.name, projectId })}
          />
        ))}
      </ul>
      <DeleteDocumentDialog
        document={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </>
  );
}

interface RowProps {
  projectId: string;
  document: DocumentListItem;
  baseSources: SourceResponse[];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function ProjectDocumentRow({
  projectId,
  document: doc,
  baseSources,
  expanded,
  onToggle,
  onDelete,
}: RowProps) {
  const navigate = useNavigate();
  const href = `/projects/${projectId}/documents/${doc.id}`;
  const panelId = `document-sources-${doc.id}`;
  const specific = doc.sources ?? [];
  const canDelete = documentPolicy.canDelete(doc.status);
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <li>
      <div
        className="group flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/40"
        onClick={() => navigate(href)}
      >
        <DocumentFormatIcon format={doc.format} />
        <div className="min-w-0 flex-1">
          <Link
            to={href}
            onClick={stop}
            className="block truncate font-medium group-hover:text-primary group-hover:underline"
            title={doc.name}
          >
            {doc.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {formatLabel(doc.format)} · {formatBytes(doc.size_bytes)} ·{' '}
            {formatDate(doc.uploaded_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AnalysisProblem projectId={projectId} document={doc} />
          <DocumentStatusBadge status={doc.status} />
        </div>
        <div className="flex items-center gap-1" onClick={stop}>
          {doc.status === 'in_progress' ? (
            <span
              className="inline-flex h-8 items-center gap-1.5 px-3 text-xs text-muted-foreground"
              role="status"
            >
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Идёт анализ
            </span>
          ) : doc.status === 'awaiting_approval' ? (
            <Button asChild size="sm" variant="outline">
              <Link to={href}>Рассмотреть правки</Link>
            </Button>
          ) : (
            <StartAnalysisButton projectId={projectId} document={doc} />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={onToggle}
              >
                <Library aria-hidden />
                <span className="tabular-nums">{specific.length}</span>
                <ChevronDown
                  aria-hidden
                  className={cn('transition-transform duration-200', expanded && 'rotate-180')}
                />
                <span className="sr-only">Специфичные источники</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Источники документа</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={canDelete ? -1 : 0}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  disabled={!canDelete}
                  aria-label={`Удалить ${doc.name}`}
                  onClick={onDelete}
                >
                  {canDelete ? <Trash2 aria-hidden /> : <Lock aria-hidden />}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {canDelete ? 'Удалить документ' : 'Нельзя удалить во время анализа'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      {expanded ? (
        <div id={panelId} className="grid gap-4 border-t bg-muted/20 px-4 py-4 md:grid-cols-2">
          <section aria-label="Базовые источники проекта" className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Базовые источники проекта
            </h4>
            {baseSources.length > 0 ? (
              <SourceList items={baseSources} />
            ) : (
              <p className="text-sm text-muted-foreground">Базовых источников нет.</p>
            )}
          </section>
          <section aria-label="Специфичные источники документа" className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Специфичные источники
            </h4>
            <ProjectSourceEditor
              projectId={projectId}
              target={{ scope: 'document', documentId: doc.id }}
              items={specific}
              lockedReason={documentPolicy.canEditSources(doc.status) ? undefined : LOCKED_SOURCES}
              emptyText="Для документа не добавлено специфичных источников."
            />
          </section>
        </div>
      ) : null}
    </li>
  );
}
