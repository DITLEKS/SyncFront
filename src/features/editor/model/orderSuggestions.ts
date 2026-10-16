import type { SuggestionResponse } from '@/api/types';
import type { LocatedSuggestion } from '@/domain/editor/projection';

/** Позиционные правки идут по документу; непривязанные — стабильно после них. */
export function orderSuggestions(
  suggestions: readonly SuggestionResponse[],
  located: Record<string, LocatedSuggestion>,
): SuggestionResponse[] {
  return suggestions
    .map((suggestion, index) => ({
      suggestion,
      index,
      offset: located[suggestion.id]?.originOffset,
    }))
    .sort((a, b) => {
      const aLocated = typeof a.offset === 'number';
      const bLocated = typeof b.offset === 'number';
      if (aLocated && bLocated) {
        const position = Number(a.offset) - Number(b.offset);
        return position || a.index - b.index;
      }
      if (aLocated) return -1;
      if (bLocated) return 1;
      return a.index - b.index;
    })
    .map(({ suggestion }) => suggestion);
}
