import { Check, FileText, MessageSquare, TriangleAlert, Undo2, X } from 'lucide-react';

import type { SuggestionResponse } from '@/api/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { LocatedSuggestion } from '@/domain/editor/projection';
import { decisionLabel, type Decision, type SuggestionStatus } from '@/domain/editor/suggestion';

import { EDITOR_TEXTS, ISSUE_TEXTS } from '../model/texts';

import { ChangeTypeLabel } from './ChangeTypeLabel';

interface SuggestionDetailsProps {
  suggestion: SuggestionResponse;
  status: SuggestionStatus;
  /** Решение есть только в буфере и ещё не отправлено. */
  unsaved: boolean;
  located: LocatedSuggestion | undefined;
  canReview: boolean;
  undoing: boolean;
  onDecide: (decision: Decision) => void;
  onUndo: () => void;
  onClose: () => void;
}

function Fragment({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-2 text-sm">
        {children}
      </div>
    </div>
  );
}

/**
 * Карточка «Предложение ИИ» по макету. Блок «источника» пока показывает раздел документа:
 * источника правки в SuggestionResponse нет (SyncBack#70). Новый текст только для чтения:
 * контракт ревью не принимает текст (SyncBack#69).
 */
export function SuggestionDetails({
  suggestion,
  status,
  unsaved,
  located,
  canReview,
  undoing,
  onDecide,
  onUndo,
  onClose,
}: SuggestionDetailsProps) {
  const { change_type: type } = suggestion;
  const confidence =
    typeof suggestion.confidence_score === 'number'
      ? Math.round(suggestion.confidence_score * 100)
      : null;

  return (
    <section
      aria-label="Карточка предложения"
      className="animate-fade-in overflow-hidden rounded-xl border bg-card shadow-md"
    >
      <header className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" aria-hidden />
            Предложение ИИ
          </span>
          <ChangeTypeLabel type={type} />
          {status !== 'pending' ? (
            <span className="text-xs font-medium text-muted-foreground">
              {decisionLabel[status]}
              {unsaved ? ' · не сохранено' : ''}
            </span>
          ) : null}
        </div>
        <Button size="iconXs" variant="ghost" onClick={onClose} aria-label="Закрыть карточку">
          <X aria-hidden />
        </Button>
      </header>

      <div className="space-y-3 p-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
            <FileText className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {suggestion.section_ref ? `Раздел: ${suggestion.section_ref}` : 'Обоснование'}
            </span>
          </p>
          <p className="mt-1 text-sm text-amber-950">
            {suggestion.rationale ?? 'ИИ не указал обоснование.'}
          </p>
          {confidence !== null ? (
            <p className="mt-1 text-xs text-amber-800/80">Уверенность ИИ: {confidence}%</p>
          ) : null}
        </div>

        {type !== 'add' ? (
          <Fragment label="Текущий текст">{suggestion.original_text}</Fragment>
        ) : null}
        {type === 'delete' ? (
          <p className="text-sm text-red-700">{EDITOR_TEXTS.deleteMessage}</p>
        ) : (
          <Fragment label="Новый текст">{suggestion.suggested_text}</Fragment>
        )}
        {type === 'add' ? (
          <p className="text-xs text-muted-foreground">{EDITOR_TEXTS.addAtEnd}</p>
        ) : null}

        {located?.issue ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden />
            <AlertDescription>{ISSUE_TEXTS[located.issue]}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          {status === 'pending' && canReview ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => onDecide('rejected')}>
                Отклонить
              </Button>
              <Button size="sm" onClick={() => onDecide('accepted')}>
                <Check aria-hidden />
                Принять
              </Button>
            </>
          ) : null}
          {status !== 'pending' ? (
            <Button size="sm" variant="outline" loading={undoing} onClick={onUndo}>
              <Undo2 aria-hidden />
              Отменить
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
