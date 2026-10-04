/**
 * Буфер решений ревью: решения копятся локально и уходят на сервер одним
 * PUT …/suggestions/review. Здесь — чистые правила, без React и хранилища.
 */
import type { Decision, EditorSuggestion, SuggestionStatus } from './suggestion';

export type DecisionBuffer = Readonly<Record<string, Decision>>;

export function effectiveStatus(
  suggestion: Pick<EditorSuggestion, 'id' | 'status'>,
  buffer: DecisionBuffer,
): SuggestionStatus {
  if (suggestion.status !== 'pending') return suggestion.status;
  return buffer[suggestion.id] ?? 'pending';
}

export interface SavePlan {
  decisions: { suggestion_id: string; decision: Decision }[];
  /** true только если после сохранения не останется pending: иначе сервер ответит 409. */
  finalize: boolean;
  /** Решения из буфера, которые уже не относятся к pending-правкам на сервере. */
  stale: string[];
}

/**
 * План сохранения. Сервер принимает решения только по pending-правкам текущего анализа;
 * уже решённые на сервере правки из буфера отбрасываются.
 *
 * @param serverPendingCount полный счётчик pending с сервера (правок может быть больше, чем загружено).
 */
export function planSave(
  suggestions: readonly Pick<EditorSuggestion, 'id' | 'status'>[],
  buffer: DecisionBuffer,
  serverPendingCount: number,
): SavePlan {
  const pendingIds = new Set(suggestions.filter((s) => s.status === 'pending').map((s) => s.id));
  const decisions: SavePlan['decisions'] = [];
  const stale: string[] = [];
  for (const [id, decision] of Object.entries(buffer)) {
    if (pendingIds.has(id)) decisions.push({ suggestion_id: id, decision });
    else stale.push(id);
  }
  return { decisions, finalize: serverPendingCount - decisions.length === 0, stale };
}

export interface ReviewProgress {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  decided: number;
  /** 0..100, целое. */
  percent: number;
}

/** Счётчики с учётом несохранённых решений: сервер присылает полные, буфер сдвигает pending. */
export function reviewProgress(
  counters: { total: number; pending: number; accepted: number; rejected: number },
  suggestions: readonly Pick<EditorSuggestion, 'id' | 'status'>[],
  buffer: DecisionBuffer,
): ReviewProgress {
  let accepted = counters.accepted;
  let rejected = counters.rejected;
  let pending = counters.pending;
  for (const suggestion of suggestions) {
    if (suggestion.status !== 'pending') continue;
    const decision = buffer[suggestion.id];
    if (!decision) continue;
    pending -= 1;
    if (decision === 'accepted') accepted += 1;
    else rejected += 1;
  }
  const decided = accepted + rejected;
  const percent = counters.total === 0 ? 100 : Math.round((decided / counters.total) * 100);
  return { total: counters.total, pending, accepted, rejected, decided, percent };
}
