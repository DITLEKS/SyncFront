import { Fragment, type ReactNode } from 'react';

/**
 * Лёгкая построчная разметка Markdown для текста документа.
 *
 * Не меняет сам текст и границы сегментов правок: строки остаются в том же потоке
 * (перенос строки сохраняется как символ), поэтому правки накладываются как раньше.
 * Поддержано: заголовки, списки, цитаты, горизонтальная линия, строки ``` и инлайн
 * `код`, **жирный**, *курсив*. Инлайн-разметка не пересекает границы правок.
 */

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^(\s*)[-*+]\s+(.*)$/;
const ORDERED = /^(\s*)(\d+[.)])\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const RULE = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const FENCE = /^```/;
const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*?\*)/;

const HEADING_CLASS: Record<number, string> = {
  1: 'text-xl font-bold',
  2: 'text-lg font-bold',
  3: 'text-base font-semibold',
};

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (index % 2 === 0) return part;
    if (part.startsWith('`')) {
      return (
        <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return <em key={index}>{part.slice(1, -1)}</em>;
  });
}

function renderLine(line: string, allowBlock: boolean): ReactNode {
  if (allowBlock) {
    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      return (
        <span className={HEADING_CLASS[level] ?? 'font-semibold'}>
          {renderInline(heading[2] ?? '')}
        </span>
      );
    }
    if (RULE.test(line)) return <span className="text-muted-foreground">────────────</span>;
    if (FENCE.test(line)) {
      return <span className="font-mono text-muted-foreground">{line}</span>;
    }
    const quote = QUOTE.exec(line);
    if (quote) {
      return (
        <span className="border-l-2 border-border pl-2 italic text-muted-foreground">
          {renderInline(quote[1] ?? '')}
        </span>
      );
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      return (
        <>
          {bullet[1]}• {renderInline(bullet[2] ?? '')}
        </>
      );
    }
    const ordered = ORDERED.exec(line);
    if (ordered) {
      return (
        <>
          {ordered[1]}
          {ordered[2]} {renderInline(ordered[3] ?? '')}
        </>
      );
    }
  }
  return <>{renderInline(line)}</>;
}

/**
 * @param atLineStart фрагмент начинается с начала строки (иначе первая строка —
 * продолжение предыдущей, и блочная разметка к ней не применяется).
 */
export function renderMarkdownText(text: string, atLineStart: boolean): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, index) => (
    <Fragment key={index}>
      {renderLine(line, index > 0 || atLineStart)}
      {index < lines.length - 1 ? '\n' : ''}
    </Fragment>
  ));
}
