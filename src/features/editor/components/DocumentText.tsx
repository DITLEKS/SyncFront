import { Check, Pencil, X } from 'lucide-react';
import { memo } from 'react';

import type { ChangeSegment, Segment } from '@/domain/editor/projection';
import { changeTypeMeta, decisionLabel, type ChangeType } from '@/domain/editor/suggestion';
import { cn } from '@/lib/cn';

import type { ViewMode } from '../model/useEditorModel';

interface DocumentTextProps {
  mode: ViewMode;
  originalText: string;
  segments: Segment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Правка занимает абзац целиком, если слева и справа от неё — перенос строки
 * (или край документа). Такие правки рисуются блоком по макету; правки внутри
 * предложения остаются инлайновыми, чтобы не рвать строку.
 */
function occupiesParagraph(segments: Segment[], index: number): boolean {
  const prev = segments[index - 1];
  const next = segments[index + 1];
  const startsLine = !prev || (prev.kind === 'text' && /\n\s*$/.test(prev.text));
  const endsLine = !next || (next.kind === 'text' && /^\s*\n/.test(next.text));
  return startsLine && endsLine;
}

/**
 * Текст документа. Сегменты мемоизированы по содержимому: решение по одной правке
 * перестраивает проекцию, но перерисовывается только изменившийся фрагмент.
 */
export function DocumentText({
  mode,
  originalText,
  segments,
  selectedId,
  onSelect,
}: DocumentTextProps) {
  return (
    <div
      className="whitespace-pre-wrap break-words font-serif text-[15px] leading-7 text-foreground"
      data-testid="document-text"
    >
      {mode === 'original'
        ? originalText
        : segments.map((segment, index) =>
            segment.kind === 'text' ? (
              <TextPart key={`t${index}`} text={segment.text} />
            ) : (
              <ChangePart
                key={segment.id}
                segment={segment}
                mode={mode}
                block={segment.changeType === 'add' || occupiesParagraph(segments, index)}
                selected={segment.id === selectedId}
                onSelect={onSelect}
              />
            ),
          )}
    </div>
  );
}

const TextPart = memo(function TextPart({ text }: { text: string }) {
  return <>{text}</>;
});

interface ChangePartProps {
  segment: ChangeSegment;
  mode: Exclude<ViewMode, 'original'>;
  /** Правка занимает абзац целиком: блочная карточка по макету. */
  block: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}

// Заголовок нерассмотренной блочной правки по макету: иконка + глагол. Доступное имя — из changeTypeMeta.
const PENDING_HEADER: Record<ChangeType, { verb: string; Icon: typeof Pencil }> = {
  modify: { verb: 'Изменить', Icon: Pencil },
  add: { verb: 'Добавить', Icon: Check },
  delete: { verb: 'Удалить', Icon: X },
};

// Нерассмотренные правки — цвет типа: рамка и левая полоса блока, инлайновая подсветка,
// заголовок и зачёркнутый старый текст.
const pendingTone = {
  modify: {
    block: 'border border-l-4 border-amber-300 border-l-amber-400 bg-amber-50/50',
    inline: 'bg-amber-50 ring-1 ring-amber-300',
    header: 'text-amber-800',
    old: 'text-amber-700/80 decoration-amber-600',
  },
  delete: {
    block: 'border border-l-4 border-red-200 border-l-red-400 bg-red-50/50',
    inline: 'bg-red-50 ring-1 ring-red-200',
    header: 'text-red-700',
    old: 'text-red-700/80 decoration-red-600',
  },
  add: {
    block: 'border border-l-4 border-emerald-200 border-l-emerald-400 bg-emerald-50/50',
    inline: 'bg-emerald-50 ring-1 ring-emerald-200',
    header: 'text-emerald-700',
    old: '',
  },
} as const;

// Принятые: изменение и добавление — зелёный блок с новым текстом, удаление — зачёркнуто.
const acceptedTone = {
  modify: { block: 'border-l-4 border-l-emerald-400 bg-emerald-50/60', inline: 'bg-emerald-50' },
  add: { block: 'border-l-4 border-l-emerald-400 bg-emerald-50/60', inline: 'bg-emerald-50' },
  delete: { block: 'bg-red-50/40', inline: '' },
} as const;

// Отклонённые: исходный текст без акцента, но блок остаётся кликабельным — чтобы отменить решение.
const rejectedTone = { block: 'border-l-4 border-l-border bg-muted/30', inline: 'bg-muted/40' };

const ChangePart = memo(
  function ChangePart({ segment, mode, block, selected, onSelect }: ChangePartProps) {
    const { changeType, status, oldText, newText } = segment;

    // «Чистовик» — как в экспорте: принятые правки применены, остальные — исходный текст. Без разметки.
    if (mode === 'clean') {
      const applied = status === 'accepted';
      if (changeType === 'add') return applied ? <span className="block">{newText}</span> : null;
      if (changeType === 'delete') return applied ? null : <>{oldText}</>;
      return <>{applied ? newText : oldText}</>;
    }

    // Отклонённое добавление в документе не показывается; оно доступно из панели «Решено».
    if (changeType === 'add' && status === 'rejected') return null;

    const meta = changeTypeMeta[changeType];
    const decided = status !== 'pending';
    const label = `${meta.label}${decided ? `, ${decisionLabel[status].toLowerCase()}` : ''}`;
    const toneClass =
      status === 'pending'
        ? pendingTone[changeType]
        : status === 'accepted'
          ? acceptedTone[changeType]
          : rejectedTone;

    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={selected}
        data-suggestion-id={segment.id}
        onClick={() => onSelect(segment.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(segment.id);
          }
        }}
        className={cn(
          'cursor-pointer outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring',
          block
            ? cn('my-3 block rounded-lg px-4 py-3', toneClass.block)
            : cn('rounded-sm box-decoration-clone px-1 py-0.5', toneClass.inline),
          selected && 'ring-2 ring-primary ring-offset-1',
        )}
      >
        {status === 'pending' ? (
          <PendingContent changeType={changeType} block={block} oldText={oldText} newText={newText} />
        ) : status === 'accepted' ? (
          changeType === 'delete' ? (
            <del className={cn('text-red-700/70 line-through decoration-red-400 decoration-2', block && 'block')}>
              {oldText}
            </del>
          ) : (
            <ins className={cn('no-underline', block && 'block')}>{newText}</ins>
          )
        ) : (
          <span className={cn(block && 'block')}>{oldText}</span>
        )}
      </span>
    );
  },
  (prev, next) =>
    prev.mode === next.mode &&
    prev.block === next.block &&
    prev.selected === next.selected &&
    prev.onSelect === next.onSelect &&
    prev.segment.status === next.segment.status &&
    prev.segment.oldText === next.segment.oldText &&
    prev.segment.newText === next.segment.newText &&
    prev.segment.changeType === next.segment.changeType,
);

interface PendingContentProps {
  changeType: ChangeType;
  block: boolean;
  oldText: string;
  newText: string;
}

/** Нерассмотренная правка: заголовок (в блоке), зачёркнутый старый текст и новый текст. */
function PendingContent({ changeType, block, oldText, newText }: PendingContentProps) {
  const { Icon, verb } = PENDING_HEADER[changeType];
  const colors = pendingTone[changeType];
  return (
    <>
      {block ? (
        // Заголовок декоративный: тип уже есть в aria-label кнопки.
        <span
          aria-hidden
          className={cn(
            'mb-1.5 flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wide',
            colors.header,
          )}
        >
          <Icon className="size-3.5" />
          {verb}
        </span>
      ) : null}
      {changeType !== 'add' ? (
        <del
          className={cn(
            'line-through decoration-2',
            colors.old,
            block && 'block',
            !block && changeType === 'modify' && 'text-muted-foreground',
          )}
        >
          {oldText}
        </del>
      ) : null}
      {changeType !== 'delete' ? (
        <ins
          className={cn(
            'no-underline',
            block && 'block',
            block && changeType === 'modify' && 'mt-1 font-semibold text-foreground',
            !block && changeType === 'modify' && 'ml-1 font-medium text-foreground',
          )}
        >
          {newText}
        </ins>
      ) : null}
    </>
  );
}
