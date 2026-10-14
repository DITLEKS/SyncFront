import { Check, FileText, MessageSquare, TriangleAlert, Undo2, X } from 'lucide-react';
import { useState } from 'react';

import type { SuggestionResponse } from '@/api/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { LocatedSuggestion } from '@/domain/editor/projection';
import { decisionLabel, type Decision, type SuggestionStatus } from '@/domain/editor/suggestion';

import { EDITOR_TEXTS, ISSUE_TEXTS } from '../model/texts';

interface SuggestionDetailsProps {
  suggestion: SuggestionResponse;
  status: SuggestionStatus;
  /** Решение есть только в буфере и ещё не отправлено. */
  unsaved: boolean;
  /** Новый текст с учётом правки пользователя (несохранённой или сохранённой). */
  newText: string;
  located: LocatedSuggestion | undefined;
  canReview: boolean;
  undoing: boolean;
  /** editedText передаётся только с accepted и только если текст отличается от предложенного ИИ. */
  onDecide: (decision: Decision, editedText?: string) => void;
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
 * источника правки в SuggestionResponse нет (SyncBack#70). «Новый текст» нерассмотренной
 * правки можно отредактировать перед принятием — текст уходит в PUT /review как edited_text
 * (SyncBack#73) и при экспорте заменяет текст ИИ. Для добавления original_text — якорь,
 * после которого встанет новый текст; без найденного якоря правка не применяется (SyncBack#78).
 */
export function SuggestionDetails({
  suggestion,
  status,
  unsaved,
  newText,
  located,
  canReview,
  undoing,
  onDecide,
  onUndo,
  onClose,
}: SuggestionDetailsProps) {
  const { change_type: type } = suggestion;
  const [draft, setDraft] = useState(newText);
  const confidence =
    typeof suggestion.confidence_score === 'number'
      ? Math.round(suggestion.confidence_score * 100)
      : null;

  const editable = status === 'pending' && canReview && type !== 'delete';
  const aiText = (suggestion.suggested_text ?? '').trim();
  const trimmedDraft = draft.trim();
  const edited = (editable ? trimmedDraft : newText.trim()) !== aiText;
  const anchor = type === 'add' ? (suggestion.original_text ?? '').trim() : '';

  const accept = () => {
    onDecide('accepted', editable && edited ? trimmedDraft : undefined);
  };

  return (
    <section
      aria-label="Карточка предложения"
      className="animate-fade-in overflow-hidden rounded-xl border bg-card shadow-xl"
    >
      <header className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="size-4 text-primary" aria-hidden />
            Предложение ИИ
          </span>
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
        {anchor ? <Fragment label="Вставить после">{anchor}</Fragment> : null}
        {type === 'delete' ? (
          <p className="text-sm text-red-700">{EDITOR_TEXTS.deleteMessage}</p>
        ) : editable ? (
          <div className="space-y-1">
            <label
              htmlFor={`new-text-${suggestion.id}`}
              className="block text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Новый текст
            </label>
            <textarea
              id={`new-text-${suggestion.id}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              className="min-h-[7rem] w-full resize-y rounded-md border bg-muted/40 p-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              {edited
                ? 'Текст изменён — в документ попадёт ваш вариант.'
                : 'Текст можно отредактировать перед принятием.'}
            </p>
          </div>
        ) : (
          <Fragment label={edited ? 'Новый текст (отредактирован)' : 'Новый текст'}>
            {newText}
          </Fragment>
        )}
        {type === 'add' && located?.inline ? (
          <p className="text-xs text-muted-foreground">{EDITOR_TEXTS.addAfterAnchor}</p>
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
              <Button size="sm" onClick={accept} disabled={editable && trimmedDraft === ''}>
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
