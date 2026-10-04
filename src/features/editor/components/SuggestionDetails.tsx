import { Check, TriangleAlert, Undo2, X } from 'lucide-react';

import type { SuggestionResponse } from '@/api/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { LocatedSuggestion } from '@/domain/editor/projection';
import { decisionLabel, type Decision, type SuggestionStatus } from '@/domain/editor/suggestion';

import { EDITOR_TEXTS, ISSUE_TEXTS } from '../model/texts';

import { ChangeTypeBadge } from './ChangeTypeBadge';

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
      className="animate-fade-in space-y-3 rounded-lg border bg-card p-4 shadow-sm"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ChangeTypeBadge type={type} />
            {status !== 'pending' ? (
              <span className="text-xs font-medium text-muted-foreground">
                {decisionLabel[status]}
                {unsaved ? ' · не сохранено' : ''}
              </span>
            ) : null}
          </div>
          {suggestion.section_ref ? (
            <p className="truncate text-xs text-muted-foreground">
              Раздел: {suggestion.section_ref}
            </p>
          ) : null}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={onClose}
          aria-label="Закрыть карточку"
        >
          <X aria-hidden />
        </Button>
      </header>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Обоснование
        </p>
        <p className="text-sm">{suggestion.rationale ?? 'ИИ не указал обоснование.'}</p>
        {confidence !== null ? (
          <p className="text-xs text-muted-foreground">Уверенность ИИ: {confidence}%</p>
        ) : null}
      </div>

      {type !== 'add' ? (
        <Fragment label="Текущий текст">{suggestion.original_text}</Fragment>
      ) : null}
      {type === 'delete' ? (
        <p className="text-sm text-red-700">{EDITOR_TEXTS.deleteMessage}</p>
      ) : (
        <Fragment label="Предлагаемый текст">{suggestion.suggested_text}</Fragment>
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

      <div className="flex flex-wrap gap-2">
        {status === 'pending' && canReview ? (
          <>
            <Button size="sm" onClick={() => onDecide('accepted')}>
              <Check aria-hidden />
              Принять
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDecide('rejected')}>
              <X aria-hidden />
              Отклонить
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
    </section>
  );
}
