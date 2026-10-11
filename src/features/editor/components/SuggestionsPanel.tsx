import { observeElementRect, useVirtualizer } from '@tanstack/react-virtual';
import { CheckCircle2, Inbox, TriangleAlert } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

import type { SuggestionResponse } from '@/api/types';
import { Progress } from '@/components/ui/progress';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/ui/state';
import type { LocatedSuggestion, LocateIssue } from '@/domain/editor/projection';
import type { ReviewProgress } from '@/domain/editor/review';
import { decisionLabel, type SuggestionStatus } from '@/domain/editor/suggestion';
import { cn } from '@/lib/cn';

import {
  ESTIMATED_CARD_HEIGHT,
  FALLBACK_VIEWPORT_HEIGHT,
  isVirtualized,
  LIST_OVERSCAN,
} from '../model/suggestionList';
import { EMPTY_FILTER_TEXTS, ISSUE_TEXTS } from '../model/texts';

import { ChangeTypeBadge } from './ChangeTypeBadge';

export type SuggestionFilter = 'pending' | 'decided' | 'all';

interface SuggestionsPanelProps {
  suggestions: SuggestionResponse[];
  statusOf: (s: SuggestionResponse) => SuggestionStatus;
  unsavedIds: ReadonlySet<string>;
  located: Record<string, LocatedSuggestion>;
  progress: ReviewProgress;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Карточка выбранной правки и блок завершения — над списком. */
  header?: React.ReactNode;
}

function shortText(s: SuggestionResponse): string {
  return (s.change_type === 'delete' ? s.original_text : s.suggested_text) ?? '';
}

export function SuggestionsPanel({
  suggestions,
  statusOf,
  unsavedIds,
  located,
  progress,
  selectedId,
  onSelect,
  header,
}: SuggestionsPanelProps) {
  const [filter, setFilter] = useState<SuggestionFilter>('pending');

  const filtered = suggestions.filter((s) => {
    const status = statusOf(s);
    if (filter === 'pending') return status === 'pending';
    if (filter === 'decided') return status !== 'pending';
    return true;
  });

  const renderCard = (s: SuggestionResponse) => (
    <SuggestionCard
      suggestion={s}
      status={statusOf(s)}
      issue={located[s.id]?.issue ?? null}
      selected={s.id === selectedId}
      unsaved={unsavedIds.has(s.id)}
      onSelect={onSelect}
    />
  );

  return (
    <aside aria-labelledby="suggestions-title" className="flex min-h-0 flex-col gap-3">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="suggestions-title" className="text-base font-semibold">
            Предложения ИИ
          </h2>
          <span className="text-sm tabular-nums text-muted-foreground">
            {progress.decided} из {progress.total} · {progress.percent}%
          </span>
        </div>
        <Progress value={progress.percent / 100} label="Прогресс проверки" />
      </div>

      {header}

      <SegmentedControl<SuggestionFilter>
        ariaLabel="Фильтр предложений"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'pending', label: 'На рассмотрении', count: progress.pending },
          { value: 'decided', label: 'Решено', count: progress.decided },
          { value: 'all', label: 'Все', count: progress.total },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title={EMPTY_FILTER_TEXTS[filter]} className="py-8" />
      ) : isVirtualized(filtered.length) ? (
        <VirtualSuggestionList items={filtered} selectedId={selectedId} renderCard={renderCard} />
      ) : (
        <ul className="space-y-2" aria-label="Список предложений">
          {filtered.map((s) => (
            <li key={s.id}>{renderCard(s)}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}

interface VirtualSuggestionListProps {
  items: SuggestionResponse[];
  selectedId: string | null;
  renderCard: (s: SuggestionResponse) => React.ReactNode;
}

/** Длинный список: в DOM только видимые карточки плюс небольшой запас сверху и снизу. */
function VirtualSuggestionList({ items, selectedId, renderCard }: VirtualSuggestionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: LIST_OVERSCAN,
    getItemKey: (index) => items[index]?.id ?? index,
    // Неизмеренный контейнер (0 px) не должен оставлять панель пустой.
    observeElementRect: (instance, cb) =>
      observeElementRect(instance, (rect) =>
        cb(rect.height > 0 ? rect : { width: rect.width, height: FALLBACK_VIEWPORT_HEIGHT }),
      ),
  });

  // Правка, выбранная кликом по тексту, должна оказаться в видимой части списка.
  useEffect(() => {
    if (!selectedId) return;
    const index = items.findIndex((s) => s.id === selectedId);
    if (index >= 0) virtualizer.scrollToIndex(index, { align: 'auto' });
  }, [selectedId, items, virtualizer]);

  return (
    <div ref={parentRef} className="max-h-[60vh] overflow-y-auto pr-1">
      <ul
        aria-label="Список предложений"
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          const suggestion = items[row.index];
          if (!suggestion) return null;
          return (
            <li
              key={row.key}
              ref={virtualizer.measureElement}
              data-index={row.index}
              className="absolute left-0 top-0 w-full pb-2"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              {renderCard(suggestion)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: SuggestionResponse;
  status: SuggestionStatus;
  issue: LocateIssue | null;
  selected: boolean;
  unsaved: boolean;
  onSelect: (id: string) => void;
}

const SuggestionCard = memo(function SuggestionCard({
  suggestion: s,
  status,
  issue,
  selected,
  unsaved,
  onSelect,
}: SuggestionCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(s.id)}
      className={cn(
        'w-full space-y-1.5 rounded-lg border bg-card p-3 text-left text-sm shadow-sm transition-colors hover:bg-accent/50',
        selected && 'border-primary ring-1 ring-primary',
      )}
    >
      <span className="flex items-center gap-2">
        <ChangeTypeBadge type={s.change_type} />
        {status !== 'pending' ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              status === 'accepted' ? 'text-emerald-700' : 'text-muted-foreground',
            )}
          >
            {status === 'accepted' ? <CheckCircle2 className="size-3" aria-hidden /> : null}
            {decisionLabel[status]}
            {unsaved ? ' · не сохранено' : ''}
          </span>
        ) : null}
        {issue ? (
          <TriangleAlert
            className="ml-auto size-4 shrink-0 text-amber-600"
            aria-label={ISSUE_TEXTS[issue]}
          />
        ) : null}
      </span>
      <span className="line-clamp-2 block break-words">{shortText(s)}</span>
      {s.section_ref ? (
        <span className="block truncate text-xs text-muted-foreground">
          Раздел: {s.section_ref}
        </span>
      ) : null}
    </button>
  );
});
