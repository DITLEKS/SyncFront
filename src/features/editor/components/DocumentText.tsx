import { memo } from 'react';

import type { ChangeSegment, Segment } from '@/domain/editor/projection';
import { changeTypeMeta, decisionLabel } from '@/domain/editor/suggestion';
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
 * (или край документа). Такие правки рисуются блоком с меткой типа; правки внутри
 * предложения остаются инлайновыми без метки, чтобы не рвать строку.
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
  /** Правка занимает абзац целиком: блочная карточка с меткой типа. */
  block: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}

// Цвета карточки правки в тексте и её метки (псевдоэлемент before).
const toneClass = {
  modify: 'bg-amber-50 ring-amber-300 before:bg-amber-200 before:text-amber-900',
  delete: 'bg-red-50 ring-red-200 before:bg-red-200 before:text-red-900',
  add: 'border-emerald-400 bg-emerald-50 before:bg-emerald-200 before:text-emerald-900',
} as const;

const LABEL_CLASS =
  'before:mb-1 before:block before:w-fit before:rounded before:px-1 before:font-sans before:text-[10px] before:font-semibold before:uppercase before:leading-4 before:tracking-wide before:content-[attr(data-label)]';

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
    const label = `${meta.label}${decided ? `, ${decisionLabel[status].toLowerCase()}` : ''}`;

    return (
      <span
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={selected}
        data-suggestion-id={segment.id}
        // Метка типа рисуется псевдоэлементом: текст правки и её доступное имя остаются прежними.
        data-label={block ? meta.label : undefined}
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
            ? cn('my-2 block rounded-md px-3 py-2', LABEL_CLASS)
            : 'box-decoration-clone rounded-sm px-1 py-0.5',
          changeType === 'add' ? 'border-l-4' : 'ring-1',
          toneClass[changeType],
          selected && 'ring-2 ring-primary ring-offset-1',
          decided && 'opacity-70',
        )}
      >
        {changeType !== 'add' ? (
          <del
            className={cn(
              'decoration-2',
              changeType === 'delete' ? 'decoration-red-600' : 'decoration-red-500',
              status === 'rejected' ? 'no-underline' : 'line-through',
              changeType === 'modify' && 'text-muted-foreground',
            )}
          >
            {oldText}
          </del>
        ) : null}
        {changeType !== 'delete' ? (
          <ins
            className={cn(
              'no-underline',
              changeType === 'modify' && 'ml-1 font-medium text-foreground',
              status === 'rejected' && 'line-through decoration-muted-foreground',
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
