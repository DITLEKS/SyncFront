/**
 * Статусная модель документа — словарь предметной области.
 * Единственный источник лейблов и цветов статусов для всего интерфейса.
 * Соответствие enum бэкенда проверяется на уровне типов в src/api/types.ts.
 */

export const DOCUMENT_STATUSES = ['draft', 'in_progress', 'awaiting_approval', 'ready'] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success';

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  /** Классы Tailwind для бейджа статуса; цвета заданы «Описанием UI». */
  badgeClassName: string;
  description: string;
}

export const statusMeta: Record<DocumentStatus, StatusMeta> = {
  draft: {
    label: 'Черновик',
    tone: 'neutral',
    badgeClassName: 'bg-slate-100 text-slate-700 ring-slate-200',
    description: 'Загружен, анализ ещё не запущен или не удался',
  },
  in_progress: {
    label: 'В работе',
    tone: 'info',
    badgeClassName: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    description: 'Выполняется ИИ-анализ',
  },
  awaiting_approval: {
    label: 'Ожидает утверждения',
    tone: 'warning',
    badgeClassName: 'bg-amber-50 text-amber-800 ring-amber-200',
    description: 'Есть предложения ИИ, которые нужно рассмотреть',
  },
  ready: {
    label: 'Готово',
    tone: 'success',
    badgeClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    description: 'Все решения сохранены, документ можно экспортировать',
  },
};

export function isDocumentStatus(value: unknown): value is DocumentStatus {
  return typeof value === 'string' && (DOCUMENT_STATUSES as readonly string[]).includes(value);
}

/**
 * Зеркало DocumentLifecycle бэкенда (app/domain/lifecycle.py) для списков,
 * где нет permissions редактора. В редакторе приоритет у permissions из ответа API.
 */
export const documentPolicy = {
  canStartAnalysis: (status: DocumentStatus): boolean => status !== 'in_progress',
  analysisNeedsConfirmation: (status: DocumentStatus): boolean => status === 'ready',
  canEditSources: (status: DocumentStatus): boolean =>
    status !== 'in_progress' && status !== 'awaiting_approval',
  canReview: (status: DocumentStatus): boolean => status === 'awaiting_approval',
  canExport: (status: DocumentStatus): boolean => status === 'ready',
  canDelete: (status: DocumentStatus): boolean => status !== 'in_progress',
  canResetReview: (status: DocumentStatus): boolean =>
    status === 'awaiting_approval' || status === 'ready',
} as const;

/** Подпись кнопки запуска анализа по «Описанию UI». */
export function analysisActionLabel(status: DocumentStatus): string {
  return status === 'ready' ? 'Проверить актуальность' : 'Анализировать';
}
