import { Pencil, Plus, X } from 'lucide-react';
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
  /** Правка занимает абзац целиком: блочная карточка с заголовком по макету. */
  block: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}

// Заголовок блочной правки по макету: иконка + глагол. Доступное имя берётся из changeTypeMeta.
const BLOCK_HEADER: Record<ChangeType, { verb: string; Icon: typeof Pencil }> = {
  modify: { verb: 'Изменить', Icon: Pencil },
  add: { verb: 'Добавить', Icon: Plus },
  delete: { verb: 'Удалить', Icon: X },
};

// Цвета по типу: рамка и левая полоса блока, инлайновая подсветка, заголовок, зачёркнутый старый текст.
const tone = {
  modify: {
    block: 'border-amber-300 border-l-amber-400 bg-amber-50/50',
    inline: 'bg-amber-50 ring-amber-300',
    header: 'text-amber-800',
    old: 'text-amber-700/80 decoration-amber-600',
  },
  delete: {
    block: 'border-red-200 border-l-red-400 bg-red-50/50',
    inline: 'bg-red-50 ring-red-200',
    header: 'text-red-700',
    old: 'text-red-700/80 decoration-red-600',
  },
  add: {
    block: 'border-emerald-200 border-l-emerald-400 bg-emerald-50/50',
    inline: 'bg-emerald-50 ring-emerald-200',
    header: 'text-emerald-700',
    old: '',
  },
} as const;

const ChangePart = memo(
  function ChangePart({ segment, mode, block, selected, onSelect }: ChangePartProps) {
    const { changeType, status, oldText, newText } = segment;

    // В «Чистовике» рассмотренные правки — обычный текст: принятые применены, отклонённые нет.
    if (mode === 'clean' && status !== 'pending') {
      const applied = status === 'accepted';
      if (changeType === 'add') return applied ? <span className="block">{newText}</span> : null;
      if (changeType === 'delete') return applied ? null : <>{oldText}</>;
      return <>{applied ? newText : oldText}</>;
    }

    const meta = changeTypeMeta[changeType];
    const decided = status !== 'pending';
    const rejected = status === 'rejected';
    const label = `${meta.label}${decided ? `, ${decisionLabel[status].toLowerCase()}` : ''}`;
    const { Icon, verb } = BLOCK_HEADER[changeType];
    const colors = tone[changeType];

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
            ? cn('my-3 block rounded-lg border border-l-4 px-4 py-3', colors.block)
            : cn('rounded-sm box-decoration-clone px-1 py-0.5 ring-1', colors.inline),
          selected && 'ring-2 ring-primary ring-offset-1',
          decided && 'opacity-70',
        )}
      >
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
              'decoration-2',
              block && 'block',
              rejected ? 'text-foreground no-underline' : cn('line-through', colors.old),
              !block && changeType === 'modify' && !rejected && 'text-muted-foreground',
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
              rejected && 'line-through decoration-muted-foreground',
            )}
          >
            {newText}
          </ins>
        ) : null}
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
