import { CheckCircle2, Inbox, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import type { SuggestionResponse } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/ui/state';
import type { LocatedSuggestion } from '@/domain/editor/projection';
import type { ReviewProgress } from '@/domain/editor/review';
import { decisionLabel, type SuggestionStatus } from '@/domain/editor/suggestion';
import { cn } from '@/lib/cn';

import { EMPTY_FILTER_TEXTS, ISSUE_TEXTS } from '../model/texts';

import { ChangeTypeBadge } from './ChangeTypeBadge';

export type SuggestionFilter = 'pending' | 'decided' | 'all';

/** Сколько карточек показывать за раз: длинный список дорисовывается по кнопке. */
export const SUGGESTIONS_RENDER_STEP = 100;

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
  const [visible, setVisible] = useState(SUGGESTIONS_RENDER_STEP);

  const filtered = suggestions.filter((s) => {
    const status = statusOf(s);
    if (filter === 'pending') return status === 'pending';
    if (filter === 'decided') return status !== 'pending';
    return true;
  });
  const shown = filtered.slice(0, visible);

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
        onChange={(next) => {
          setFilter(next);
          setVisible(SUGGESTIONS_RENDER_STEP);
        }}
        options={[
          { value: 'pending', label: 'На рассмотрении', count: progress.pending },
          { value: 'decided', label: 'Решено', count: progress.decided },
          { value: 'all', label: 'Все', count: progress.total },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title={EMPTY_FILTER_TEXTS[filter]} className="py-8" />
      ) : (
        <ul className="space-y-2" aria-label="Список предложений">
          {shown.map((s) => {
            const status = statusOf(s);
            const issue = located[s.id]?.issue;
            const selected = s.id === selectedId;
            return (
              <li key={s.id}>
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
                        {status === 'accepted' ? (
                          <CheckCircle2 className="size-3" aria-hidden />
                        ) : null}
                        {decisionLabel[status]}
                        {unsavedIds.has(s.id) ? ' · не сохранено' : ''}
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
              </li>
            );
          })}
        </ul>
      )}
      {filtered.length > shown.length ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setVisible((n) => n + SUGGESTIONS_RENDER_STEP)}
        >
          Показать ещё {Math.min(SUGGESTIONS_RENDER_STEP, filtered.length - shown.length)}
        </Button>
      ) : null}
    </aside>
  );
}
