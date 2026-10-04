/**
 * Проекция текста документа с правками. Сервер не меняет текст при принятии правок,
 * поэтому «Правки» и «Чистовик» строятся здесь — по тем же правилам, что и
 * экспортёры SyncBack (TextExporter / DocxExporter), иначе чистовик и экспорт разойдутся:
 *
 * - принятые правки применяются по очереди в порядке ответа сервера (created_at, id),
 *   каждая — к уже изменённому тексту;
 * - modify/delete заменяют первое вхождение original_text во всём тексте;
 *   в docx вхождение ищется внутри одного абзаца, поэтому фрагмент с переводом строки не применится;
 * - add дописывается в конец документа.
 */
import type { ChangeType, EditorSuggestion, SuggestionStatus } from './suggestion';

export interface DocumentSection {
  ref: string;
  start_offset: number;
  end_offset: number;
}

/** Почему правку нельзя показать в тексте или её применение отличается от ожидаемого. */
export type LocateIssue =
  /** Фрагмента нет в тексте: сервер правку не применит. */
  | 'not_found'
  /** Фрагмент пересекается с другой правкой: результат экспорта может отличаться. */
  | 'overlap'
  /** Нет текста для замены или вставки, либо фрагмент занимает несколько абзацев docx. */
  | 'not_applicable'
  /** Первое вхождение — вне указанного раздела: заменится именно оно. */
  | 'outside_section';

export interface LocatedSuggestion {
  issue: LocateIssue | null;
  /** Будет ли правка применена при экспорте, если её принять. */
  exportable: boolean;
  /** Показана ли правка внутри текста. */
  inline: boolean;
}

export interface TextSegment {
  kind: 'text';
  text: string;
}

export interface ChangeSegment {
  kind: 'change';
  id: string;
  changeType: ChangeType;
  status: SuggestionStatus;
  oldText: string;
  newText: string;
}

export type Segment = TextSegment | ChangeSegment;

export type AddPlacement = 'section' | 'end';

export interface ProjectionInput {
  text: string;
  sections: readonly DocumentSection[];
  format: string;
  /** В порядке ответа сервера: так же их применяет экспорт. */
  suggestions: readonly EditorSuggestion[];
  statusOf: (suggestion: EditorSuggestion) => SuggestionStatus;
  /**
   * Где показывать добавления. Экспорт дописывает их в конец документа (`end`);
   * в режиме «Правки» читать удобнее рядом с разделом (`section`).
   */
  addPlacement: AddPlacement;
}

export interface Projection {
  segments: Segment[];
  located: Record<string, LocatedSuggestion>;
}

interface TextPiece {
  kind: 'text';
  text: string;
  /** Смещение начала куска в исходном тексте (UTF-16). */
  origin: number;
}

type Piece = TextPiece | ChangeSegment;

/** Вклад куска в текст, который в этот момент видит сервер. */
function serverText(piece: Piece): string {
  if (piece.kind === 'text') return piece.text;
  if (piece.status !== 'accepted') return piece.oldText;
  return piece.changeType === 'delete' ? '' : piece.newText;
}

// DOC сервер экспортирует тем же DocxExporter, что и DOCX.
const isDocx = (format: string) => ['docx', 'doc'].includes(format.toLowerCase());

/**
 * Офсеты разделов сервер считает в кодовых точках Python, а строки JS — в UTF-16.
 * Без суррогатных пар они совпадают, иначе пересчитываем.
 */
export function sectionsInUtf16(
  text: string,
  sections: readonly DocumentSection[],
): DocumentSection[] {
  if (!/[\uD800-\uDFFF]/.test(text)) return [...sections];
  const toUtf16: number[] = [];
  let unit = 0;
  for (const char of text) {
    toUtf16.push(unit);
    unit += char.length;
  }
  toUtf16.push(unit);
  const map = (offset: number) => toUtf16[Math.min(offset, toUtf16.length - 1)] ?? unit;
  return sections.map((s) => ({
    ...s,
    start_offset: map(s.start_offset),
    end_offset: map(s.end_offset),
  }));
}

function changeOf(suggestion: EditorSuggestion, status: SuggestionStatus): ChangeSegment {
  return {
    kind: 'change',
    id: suggestion.id,
    changeType: suggestion.change_type,
    status,
    oldText: suggestion.original_text ?? '',
    newText: suggestion.suggested_text ?? '',
  };
}

export function buildProjection(input: ProjectionInput): Projection {
  const { text, format, suggestions, statusOf, addPlacement } = input;
  const sections = sectionsInUtf16(text, input.sections);
  const located: Record<string, LocatedSuggestion> = {};
  let pieces: Piece[] = [{ kind: 'text', text, origin: 0 }];
  const adds: { suggestion: EditorSuggestion; status: SuggestionStatus }[] = [];

  for (const suggestion of suggestions) {
    const status = statusOf(suggestion);

    if (suggestion.change_type === 'add') {
      if (!suggestion.suggested_text) {
        located[suggestion.id] = { issue: 'not_applicable', exportable: false, inline: false };
      } else {
        adds.push({ suggestion, status });
      }
      continue;
    }

    const old = suggestion.original_text ?? '';
    if (!old || (isDocx(format) && old.includes('\n'))) {
      located[suggestion.id] = { issue: 'not_applicable', exportable: false, inline: false };
      continue;
    }

    const contributions = pieces.map(serverText);
    const index = contributions.join('').indexOf(old);
    if (index === -1) {
      located[suggestion.id] = { issue: 'not_found', exportable: false, inline: false };
      continue;
    }

    let cursor = 0;
    let target = -1;
    for (let i = 0; i < pieces.length; i += 1) {
      const length = contributions[i]?.length ?? 0;
      const piece = pieces[i];
      if (piece?.kind === 'text' && index >= cursor && index + old.length <= cursor + length) {
        target = i;
        break;
      }
      cursor += length;
    }
    const piece = pieces[target];
    if (!piece || piece.kind !== 'text') {
      // Сервер применит правку к тексту, уже изменённому соседней правкой; показать это точно нельзя.
      located[suggestion.id] = { issue: 'overlap', exportable: true, inline: false };
      continue;
    }

    const start = index - cursor;
    const originStart = piece.origin + start;
    const section = suggestion.section_ref
      ? sections.find((s) => s.ref === suggestion.section_ref)
      : undefined;
    const outside =
      section !== undefined &&
      (originStart < section.start_offset || originStart + old.length > section.end_offset);
    located[suggestion.id] = {
      issue: outside ? 'outside_section' : null,
      exportable: true,
      inline: true,
    };

    const replacement: Piece[] = [];
    if (start > 0)
      replacement.push({ kind: 'text', text: piece.text.slice(0, start), origin: piece.origin });
    replacement.push(changeOf(suggestion, status));
    const tail = piece.text.slice(start + old.length);
    if (tail) replacement.push({ kind: 'text', text: tail, origin: originStart + old.length });
    pieces = [...pieces.slice(0, target), ...replacement, ...pieces.slice(target + 1)];
  }

  for (const { suggestion, status } of adds) {
    located[suggestion.id] = { issue: null, exportable: true, inline: true };
    const section =
      addPlacement === 'section' && suggestion.section_ref
        ? sections.find((s) => s.ref === suggestion.section_ref)
        : undefined;
    pieces = section
      ? insertAt(pieces, section.end_offset, changeOf(suggestion, status))
      : [...pieces, changeOf(suggestion, status)];
  }

  return { segments: pieces.map(toSegment), located };
}

/** Вставить добавление перед исходным офсетом — концом раздела. */
function insertAt(pieces: Piece[], originOffset: number, change: ChangeSegment): Piece[] {
  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i];
    if (!piece || piece.kind !== 'text') continue;
    const end = piece.origin + piece.text.length;
    if (originOffset < piece.origin || originOffset > end) continue;
    const at = originOffset - piece.origin;
    const before: Piece[] = at > 0 ? [{ ...piece, text: piece.text.slice(0, at) }] : [];
    const after: Piece[] =
      at < piece.text.length
        ? [{ kind: 'text', text: piece.text.slice(at), origin: originOffset }]
        : [];
    return [...pieces.slice(0, i), ...before, change, ...after, ...pieces.slice(i + 1)];
  }
  return [...pieces, change];
}

function toSegment(piece: Piece): Segment {
  return piece.kind === 'text' ? { kind: 'text', text: piece.text } : piece;
}

/**
 * Текст, который получится при экспорте: принятые правки применены, остальные — нет.
 * Нужен для «Чистовика» без разметки и для проверки совпадения с сервером в тестах.
 */
export function exportedText(projection: Projection, format: string): string {
  let body = '';
  const addedTexts: string[] = [];
  for (const segment of projection.segments) {
    if (segment.kind === 'text') {
      body += segment.text;
    } else if (segment.changeType === 'add') {
      if (segment.status === 'accepted') addedTexts.push(segment.newText);
    } else {
      body +=
        segment.status === 'accepted'
          ? segment.changeType === 'delete'
            ? ''
            : segment.newText
          : segment.oldText;
    }
  }
  for (const added of addedTexts) {
    body = isDocx(format) ? `${body}\n${added}` : `${body.replace(/\n+$/, '')}\n\n${added}\n`;
  }
  return body;
}
