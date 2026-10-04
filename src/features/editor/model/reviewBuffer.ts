import { create } from 'zustand';

import type { DecisionBuffer } from '@/domain/editor/review';
import type { Decision } from '@/domain/editor/suggestion';

interface ReviewBufferStore {
  /** Документ и анализ, к которым относятся решения: `${documentId}:${jobId}`. */
  scope: string | null;
  decisions: DecisionBuffer;
  /** Привязать буфер к анализу; решения другого документа или анализа отбрасываются. */
  bind: (scope: string) => void;
  decide: (id: string, decision: Decision) => void;
  undo: (id: string) => void;
  forget: (ids: readonly string[]) => void;
  clear: () => void;
}

/**
 * Несохранённые решения ревью. Живут вне кеша запросов: перезапрос редактора
 * (SSE, конфликт версий) не должен терять то, что пользователь уже решил.
 */
export const useReviewBuffer = create<ReviewBufferStore>((set) => ({
  scope: null,
  decisions: {},
  bind: (scope) => set((state) => (state.scope === scope ? state : { scope, decisions: {} })),
  decide: (id, decision) => set((state) => ({ decisions: { ...state.decisions, [id]: decision } })),
  undo: (id) => set((state) => ({ decisions: without(state.decisions, [id]) })),
  forget: (ids) => set((state) => ({ decisions: without(state.decisions, ids) })),
  clear: () => set({ decisions: {} }),
}));

export const reviewScope = (documentId: string, jobId: string | null | undefined) =>
  `${documentId}:${jobId ?? 'none'}`;

function without(decisions: DecisionBuffer, ids: readonly string[]): DecisionBuffer {
  const drop = new Set(ids);
  return Object.fromEntries(Object.entries(decisions).filter(([id]) => !drop.has(id)));
}
