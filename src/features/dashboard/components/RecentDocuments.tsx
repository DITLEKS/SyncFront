import { ArrowRight, ChevronRight, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import type { RecentDocumentItem } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { isDocumentStatus } from '@/domain/document/status';
import { DocumentStatusBadge } from '@/features/documents';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';

import { useRecentDocuments } from '../hooks/useDashboard';

export const RECENT_EMPTY_TEXT = {
  title: 'Недавних документов нет',
  description: 'Здесь появятся документы, которые вы открывали последними.',
} as const;

function ChangesCell({ resolved, total }: { resolved: number; total: number }) {
  if (total === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex min-w-24 items-center gap-2">
      <span className="tabular-nums">
        {resolved}/{total}
      </span>
      <Progress
        value={resolved / total}
        label={`Решено ${resolved} из ${total}`}
        className="w-16"
      />
    </div>
  );
}

function RecentRow({ item }: { item: RecentDocumentItem }) {
  const navigate = useNavigate();
  const documentLink = `/projects/${item.project_id}/documents/${item.id}`;
  return (
    <tr
      className="group cursor-pointer border-t transition-colors hover:bg-muted/50"
      // Вся строка кликабельна для мыши; для клавиатуры есть ссылки в ячейках.
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) return;
        navigate(documentLink);
      }}
    >
      <td className="max-w-64 px-4 py-3">
        <Link
          to={documentLink}
          className="block truncate font-medium hover:underline"
          title={item.title}
        >
          {item.title}
        </Link>
      </td>
      <td className="max-w-48 px-4 py-3">
        <Link
          to={`/projects/${item.project_id}`}
          className="block truncate text-muted-foreground hover:text-foreground hover:underline"
        >
          {item.project_name}
        </Link>
      </td>
      <td className="px-4 py-3">
        <ChangesCell resolved={item.suggestions_resolved} total={item.suggestions_total} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
        {formatDate(item.last_opened_at)}
      </td>
      <td className="px-4 py-3">
        {isDocumentStatus(item.status) ? <DocumentStatusBadge status={item.status} /> : item.status}
      </td>
      <td className="w-8 pr-3">
        <ChevronRight
          className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </td>
    </tr>
  );
}

/** «Недавние документы»: до пяти последних открытых, от самого свежего. */
export function RecentDocuments() {
  const recent = useRecentDocuments();

  let body: React.ReactNode;
  if (recent.isPending) {
    body = (
      <div className="space-y-2 p-4" aria-label="Загрузка недавних документов">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-9" />
        ))}
      </div>
    );
  } else if (recent.isError) {
    body = (
      <ErrorState
        className="m-4"
        message={getErrorMessage(recent.error)}
        onRetry={() => recent.refetch()}
      />
    );
  } else if (recent.data.length === 0) {
    body = (
      <EmptyState
        className="m-4 border-0"
        icon={Clock}
        title={RECENT_EMPTY_TEXT.title}
        description={RECENT_EMPTY_TEXT.description}
      />
    );
  } else {
    body = (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Документ</th>
              <th className="px-4 py-2 font-medium">Проект</th>
              <th className="px-4 py-2 font-medium">Изменений</th>
              <th className="px-4 py-2 font-medium">Открыт</th>
              <th className="px-4 py-2 font-medium">Статус</th>
              <th className="w-8" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {recent.data.slice(0, 5).map((item) => (
              <RecentRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section aria-labelledby="recent-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-title" className="text-base font-semibold">
          Недавние документы
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/documents">
            Все документы
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
      <div className="rounded-lg border bg-card shadow-sm">{body}</div>
    </section>
  );
}
