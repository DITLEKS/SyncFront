import { type DocumentStatus, isDocumentStatus } from '@/domain/document/status';

export type StatusFilter = DocumentStatus | 'all';

/** Порядок фильтров по «Описанию UI»: от итогового статуса к черновику. */
export const STATUS_FILTER_ORDER: readonly StatusFilter[] = [
  'all',
  'ready',
  'awaiting_approval',
  'in_progress',
  'draft',
];

export const MY_DOCUMENTS_PAGE_SIZE = 20;

export interface MyDocumentsFilters {
  status: StatusFilter;
  query: string;
  page: number;
}

/** Состояние таблицы живёт в URL (?status=&q=&page=), чтобы ссылки с дашборда открывали нужный фильтр. */
export function parseFilters(params: URLSearchParams): MyDocumentsFilters {
  const status = params.get('status');
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return {
    status: isDocumentStatus(status) ? status : 'all',
    query: params.get('q') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function filtersToParams(filters: MyDocumentsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.query) params.set('q', filters.query);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export type EmptyReason = 'no_documents' | 'empty_category' | 'nothing_found';

/** Какой из трёх текстов пустого состояния показать. */
export function emptyReason(
  filters: Pick<MyDocumentsFilters, 'status' | 'query'>,
  totalAll: number | undefined,
): EmptyReason {
  if (filters.query.trim()) return 'nothing_found';
  if (filters.status !== 'all' && (totalAll ?? 0) > 0) return 'empty_category';
  return 'no_documents';
}
