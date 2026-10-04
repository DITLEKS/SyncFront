import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { AttentionDocumentItem } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state';
import { DocumentStatusBadge } from '@/features/documents';
import { getErrorMessage } from '@/lib/errors';
import { pluralize } from '@/lib/format';

import { useAttentionDocuments, useDashboardSummary } from '../hooks/useDashboard';

export const ATTENTION_ALL_LINK = '/documents?status=awaiting_approval';

function AttentionCard({ item }: { item: AttentionDocumentItem }) {
  return (
    <li>
      <Link
        to={`/projects/${item.project_id}/documents/${item.id}`}
        className="group flex h-full flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium" title={item.title}>
              {item.title}
            </p>
            <p className="truncate text-sm text-muted-foreground">{item.project_name}</p>
          </div>
          {/* Сервер отдаёт сюда только документы в awaiting_approval. */}
          <DocumentStatusBadge status="awaiting_approval" className="shrink-0" />
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="size-4 text-primary" aria-hidden />
            {item.pending_suggestions}{' '}
            {pluralize(item.pending_suggestions, [
              'предложение ИИ',
              'предложения ИИ',
              'предложений ИИ',
            ])}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Открыть в редакторе
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  );
}

/** «Требуют внимания»: до четырёх документов на утверждении. Без документов блок скрыт. */
export function AttentionDocuments() {
  const attention = useAttentionDocuments();
  const summary = useDashboardSummary();

  if (attention.isPending) {
    return (
      <section aria-label="Требуют внимания" className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </section>
    );
  }
  if (attention.isError) {
    return (
      <section aria-labelledby="attention-title" className="space-y-3">
        <h2 id="attention-title" className="text-base font-semibold">
          Требуют внимания
        </h2>
        <ErrorState
          message={getErrorMessage(attention.error)}
          onRetry={() => attention.refetch()}
        />
      </section>
    );
  }

  const items = attention.data;
  if (items.length === 0) return null;
  // Общее число — из сводки; пока она грузится, показываем то, что уже видно.
  const total = Math.max(summary.data?.awaiting_approval_count ?? items.length, items.length);

  return (
    <section aria-labelledby="attention-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="attention-title" className="flex items-center gap-2 text-base font-semibold">
          Требуют внимания
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-800">
            {total}
          </span>
        </h2>
        {total > items.length ? (
          <Button asChild variant="ghost" size="sm">
            <Link to={ATTENTION_ALL_LINK}>
              Посмотреть все
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {items.slice(0, 4).map((item) => (
          <AttentionCard key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
