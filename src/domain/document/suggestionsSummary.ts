/** Столбец «Изм.»: прочерк без анализа или без правок, иначе total и доля рассмотренных. */
export interface SuggestionCountersLike {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

export type SuggestionsSummary =
  { kind: 'none' } | { kind: 'some'; total: number; resolved: number; progress: number };

export function suggestionsSummary(counters: SuggestionCountersLike): SuggestionsSummary {
  // analysis в списках сейчас всегда null, поэтому решение принимаем только по счётчикам.
  if (counters.total <= 0) return { kind: 'none' };
  const resolved = counters.accepted + counters.rejected;
  return {
    kind: 'some',
    total: counters.total,
    resolved,
    progress: Math.min(1, resolved / counters.total),
  };
}
