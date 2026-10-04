import { ExternalLink, FileText, Lock, Search, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import type { DocumentListItem } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { documentPolicy, statusMeta } from '@/domain/document/status';
import { suggestionsSummary } from '@/domain/document/suggestionsSummary';
import { getErrorMessage } from '@/lib/errors';
import { formatBytes, formatDate } from '@/lib/format';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

import { useMyDocuments, useMyDocumentsTotal } from '../hooks/useDocuments';
import {
  emptyReason,
  filtersToParams,
  MY_DOCUMENTS_PAGE_SIZE,
  parseFilters,
  STATUS_FILTER_ORDER,
  type StatusFilter,
} from '../model/myDocumentsFilters';

import { DeleteDocumentDialog, type DocumentToDelete } from './DeleteDocumentDialog';
import { DocumentFormatIcon } from './DocumentFormatIcon';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { UploadDocumentDialog } from './UploadDocumentDialog';

export const EMPTY_TEXTS = {
  no_documents:
    'Здесь пока нет документов. Загрузите первый документ, чтобы проверить его актуальность.',
  empty_category: 'В выбранной категории пока нет документов.',
  nothing_found: 'По вашему запросу ничего не найдено.',
} as const;

interface MyDocumentsViewProps {
  renderHeader: (props: {
    total: number | undefined;
    uploadButton: React.ReactNode;
  }) => React.ReactNode;
}

export function MyDocumentsView({ renderHeader }: MyDocumentsViewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams);
  const [searchInput, setSearchInput] = useState(filters.query);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<DocumentToDelete | null>(null);

  const update = (patch: Partial<typeof filters>) =>
    setSearchParams(filtersToParams({ ...filters, page: 1, ...patch }), { replace: true });

  // Ввод в поле синхронизируется с URL после паузы, а не на каждый символ.
  useEffect(() => {
    if (debouncedSearch.trim() !== filters.query) update({ query: debouncedSearch.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- реагируем только на итог ввода
  }, [debouncedSearch]);

  const total = useMyDocumentsTotal();
  const list = useMyDocuments({
    status: filters.status === 'all' ? undefined : filters.status,
    search: filters.query || undefined,
    limit: MY_DOCUMENTS_PAGE_SIZE,
    offset: (filters.page - 1) * MY_DOCUMENTS_PAGE_SIZE,
    sort_by: 'created_at',
    sort_dir: 'desc',
  });

  const uploadButton = (
    <Button onClick={() => setUploading(true)}>
      <Upload aria-hidden />
      Загрузить документ
    </Button>
  );

  const options = STATUS_FILTER_ORDER.map((value) => ({
    value,
    label: value === 'all' ? 'Все' : statusMeta[value].label,
  }));

  const items = list.data?.items ?? [];
  const pageCount = list.data
    ? Math.max(1, Math.ceil(list.data.total / MY_DOCUMENTS_PAGE_SIZE))
    : 1;
  const reason = emptyReason(filters, total.data);

  return (
    <>
      {renderHeader({ total: total.data, uploadButton })}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Поиск по названию"
            aria-label="Поиск документов по названию"
            className="pl-9"
          />
        </div>
        <SegmentedControl<StatusFilter>
          ariaLabel="Фильтр по статусу"
          value={filters.status}
          onChange={(status) => update({ status })}
          options={options}
        />
      </div>

      {list.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Загрузка документов">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={reason === 'nothing_found' ? Search : FileText}
          title={EMPTY_TEXTS[reason]}
          description={
            reason === 'nothing_found'
              ? 'Попробуйте изменить поисковый запрос или выбранный фильтр.'
              : undefined
          }
          action={reason === 'no_documents' ? uploadButton : undefined}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5">
                    Документ
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Проект
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right"
                    title="Количество предложенных ИИ изменений"
                  >
                    Изм.
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Размер
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Дата
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Статус
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    <span className="sr-only">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody
                className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}
              >
                {items.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    document={doc}
                    onOpen={(href) => navigate(href)}
                    onDelete={() =>
                      setDeleting({ id: doc.id, name: doc.name, projectId: doc.project.id })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 ? (
            <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Страницы">
              <span className="text-muted-foreground">
                Страница {filters.page} из {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page <= 1}
                  onClick={() => update({ page: filters.page - 1 })}
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page >= pageCount}
                  onClick={() => update({ page: filters.page + 1 })}
                >
                  Вперёд
                </Button>
              </div>
            </nav>
          ) : null}
        </>
      )}

      <UploadDocumentDialog open={uploading} onOpenChange={setUploading} />
      <DeleteDocumentDialog
        document={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </>
  );
}

interface DocumentRowProps {
  document: DocumentListItem;
  onOpen: (href: string) => void;
  onDelete: () => void;
}

/**
 * Клик по свободной области строки открывает документ. Ссылки и кнопки внутри
 * останавливают всплытие, чтобы не срабатывали два перехода сразу.
 */
function DocumentRow({ document: doc, onOpen, onDelete }: DocumentRowProps) {
  const href = `/projects/${doc.project.id}/documents/${doc.id}`;
  const changes = suggestionsSummary(doc.suggestions);
  const canDelete = documentPolicy.canDelete(doc.status);
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <tr
      className="group cursor-pointer border-b last:border-0 hover:bg-muted/40"
      onClick={() => onOpen(href)}
    >
      <td className="px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <DocumentFormatIcon format={doc.format} />
          <Link
            to={href}
            onClick={stop}
            className="max-w-[18rem] truncate font-medium group-hover:text-primary group-hover:underline"
            title={doc.name}
          >
            {doc.name}
          </Link>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <Link
          to={`/projects/${doc.project.id}`}
          onClick={stop}
          className="inline-flex max-w-[12rem] truncate rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
          title={doc.project.name}
        >
          {doc.project.name}
        </Link>
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">
        {changes.kind === 'none' ? <span className="text-muted-foreground">—</span> : changes.total}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted-foreground">
        {formatBytes(doc.size_bytes)}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
        {formatDate(doc.uploaded_at)}
      </td>
      <td className="px-4 py-2.5">
        <DocumentStatusBadge status={doc.status} />
      </td>
      <td className="px-4 py-2.5" onClick={stop}>
        <div className="flex justify-end gap-1 opacity-60 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon" className="size-8">
                <Link to={href} aria-label={`Открыть ${doc.name}`}>
                  <ExternalLink aria-hidden />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Открыть</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* span держит подсказку и у неактивной кнопки */}
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
              {canDelete ? 'Удалить' : 'Нельзя удалить во время анализа'}
            </TooltipContent>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}
