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
  selected: boolean;
  onSelect: (id: string) => void;
}

const ChangePart = memo(
  function ChangePart({ segment, mode, selected, onSelect }: ChangePartProps) {
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
        onClick={() => onSelect(segment.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(segment.id);
          }
        }}
        className={cn(
          'cursor-pointer rounded-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring',
          changeType === 'add' && 'block',
          selected && 'ring-2 ring-primary ring-offset-1',
          decided && 'opacity-70',
        )}
      >
        {changeType !== 'add' ? (
          <del
            className={cn(
              'decoration-2',
              changeType === 'delete' ? 'bg-red-100 decoration-red-600' : 'decoration-red-500',
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
              changeType === 'add' ? 'bg-emerald-100' : 'bg-amber-100',
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
    prev.selected === next.selected &&
    prev.onSelect === next.onSelect &&
    prev.segment.status === next.segment.status &&
    prev.segment.oldText === next.segment.oldText &&
    prev.segment.newText === next.segment.newText &&
    prev.segment.changeType === next.segment.changeType,
);
