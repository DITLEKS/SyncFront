/**
 * Словарь правок ИИ. Статусы и типы совпадают с SuggestionResponse бэкенда;
 * совпадение проверяется типами в src/api/types.ts.
 */

export const CHANGE_TYPES = ['modify', 'add', 'delete'] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export const SUGGESTION_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export type Decision = Exclude<SuggestionStatus, 'pending'>;

export interface ChangeTypeMeta {
  label: string;
  /** Цвета разметки по «Описанию UI»: изменение — жёлтый, добавление — зелёный, удаление — красный. */
  tone: 'amber' | 'emerald' | 'red';
}

export const changeTypeMeta: Record<ChangeType, ChangeTypeMeta> = {
  modify: { label: 'Изменение', tone: 'amber' },
  add: { label: 'Добавление', tone: 'emerald' },
  delete: { label: 'Удаление', tone: 'red' },
};

export const decisionLabel: Record<Decision, string> = {
  accepted: 'Принято',
  rejected: 'Отклонено',
};

/** Минимум полей правки, нужный доменной логике редактора. */
export interface EditorSuggestion {
  id: string;
  change_type: ChangeType;
  original_text?: string | null;
  suggested_text?: string | null;
  section_ref?: string | null;
  status: SuggestionStatus;
}
