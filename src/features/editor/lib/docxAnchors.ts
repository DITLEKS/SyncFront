/**
 * Привязка правок к DOM, который построил docx-preview. Координат в структуре docx у правок
 * нет — только `original_text`, поэтому ищем его так же, как сервер: первое вхождение
 * внутри одного абзаца (`DocxExporter` тоже не меняет текст через границу абзаца).
 * Найденный фрагмент оборачивается в `<span data-suggestion-id>` — даже если он пересекает
 * несколько ранов с разным форматированием: Range.extractContents клонирует частичные
 * обёртки, так что жирный/курсив внутри фрагмента сохраняются.
 */
import { sectionsInUtf16, type DocumentSection } from '@/domain/editor/projection';
import type { EditorSuggestion } from '@/domain/editor/suggestion';

export const ANCHOR_ATTR = 'data-suggestion-id';
const ANCHOR_SELECTOR = `[${ANCHOR_ATTR}]`;
/** Абзацы docx-preview: `p` в теле и в ячейках таблиц; заголовки Word — тоже `p` со стилем. */
const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6';

export type AnchorMiss = 'not_found' | 'overlap' | 'not_applicable';

export interface AnchorReport {
  anchored: Map<string, HTMLElement>;
  missed: Map<string, AnchorMiss>;
  /** Исходное содержимое каждого якоря — чтобы отрисовка могла вернуть его при любом решении. */
  originals: WeakMap<HTMLElement, DocumentFragment>;
}

export interface AnchorInput {
  suggestions: readonly EditorSuggestion[];
  sections: readonly DocumentSection[];
  /** plain_text сервера: по нему ищется абзац-якорь для добавлений (конец раздела). */
  plainText: string;
}

interface TextRun {
  node: Text;
  start: number;
}

interface FlatBlock {
  element: HTMLElement;
  text: string;
  runs: TextRun[];
}

/** Нормализация 1:1 по длине, чтобы смещения в нормализованном тексте совпадали с DOM. */
function normalize(text: string): string {
  return text.replace(/\u00a0/g, ' ');
}

function flatten(element: HTMLElement): FlatBlock {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const runs: TextRun[] = [];
  let text = '';
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const textNode = node as Text;
    runs.push({ node: textNode, start: text.length });
    text += normalize(textNode.data);
  }
  return { element, text, runs };
}

function collectBlocks(root: HTMLElement): FlatBlock[] {
  return Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))
    .filter((element) => element.closest(ANCHOR_SELECTOR) === null)
    .map(flatten);
}

/**
 * Точка (узел, смещение) для смещения в плоском тексте. Для начала берём последний ран,
 * начинающийся не позже смещения; для конца — последний ран, начинающийся строго раньше,
 * чтобы граница легла в конец узла, а не в начало следующего.
 */
function pointAt(runs: TextRun[], offset: number, isEnd: boolean): { node: Text; offset: number } {
  let chosen = runs[0];
  if (!chosen) throw new Error('empty block');
  for (const run of runs) {
    if (run.start < offset || (!isEnd && run.start === offset)) chosen = run;
    else break;
  }
  return { node: chosen.node, offset: offset - chosen.start };
}

function rangeFor(block: FlatBlock, start: number, length: number): Range {
  const range = block.element.ownerDocument.createRange();
  const from = pointAt(block.runs, start, false);
  const to = pointAt(block.runs, start + length, true);
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  return range;
}

function intersectsAnchor(block: FlatBlock, range: Range): boolean {
  return Array.from(block.element.querySelectorAll(ANCHOR_SELECTOR)).some((anchor) =>
    range.intersectsNode(anchor),
  );
}

function wrap(doc: Document, range: Range, id: string): HTMLElement {
  const span = doc.createElement('span');
  span.setAttribute(ANCHOR_ATTR, id);
  span.appendChild(range.extractContents());
  range.insertNode(span);
  return span;
}

/**
 * Абзац, после которого вставить добавление: последняя непустая строка раздела в plain_text,
 * если она встречается в документе ровно один раз (иначе пробуем строки выше, до трёх).
 */
function paragraphForAdd(
  blocks: FlatBlock[],
  suggestion: EditorSuggestion,
  sections: readonly DocumentSection[],
  plainText: string,
): HTMLElement | null {
  const section = suggestion.section_ref
    ? sections.find((s) => s.ref === suggestion.section_ref)
    : undefined;
  if (!section) return null;
  const lines = plainText
    .slice(section.start_offset, section.end_offset)
    .split('\n')
    .map((line) => normalize(line).trim())
    .filter(Boolean)
    .reverse()
    .slice(0, 3);
  for (const line of lines) {
    const matches = blocks.filter((block) => block.text.trim() === line);
    if (matches.length === 1) return matches[0]?.element ?? null;
  }
  return null;
}

export function anchorSuggestions(root: HTMLElement, input: AnchorInput): AnchorReport {
  const anchored = new Map<string, HTMLElement>();
  const missed = new Map<string, AnchorMiss>();
  const originals = new WeakMap<HTMLElement, DocumentFragment>();
  const sections = sectionsInUtf16(input.plainText, input.sections);
  const adds: EditorSuggestion[] = [];

  for (const suggestion of input.suggestions) {
    if (suggestion.change_type === 'add') {
      if (suggestion.suggested_text) adds.push(suggestion);
      else missed.set(suggestion.id, 'not_applicable');
      continue;
    }
    const needle = normalize(suggestion.original_text ?? '');
    if (!needle || needle.includes('\n')) {
      missed.set(suggestion.id, 'not_applicable');
      continue;
    }
    // Блоки собираем заново: предыдущая обёртка уже изменила DOM.
    const blocks = collectBlocks(root);
    let placed = false;
    for (const block of blocks) {
      const index = block.text.indexOf(needle);
      if (index === -1) continue;
      const range = rangeFor(block, index, needle.length);
      if (intersectsAnchor(block, range)) {
        missed.set(suggestion.id, 'overlap');
      } else {
        const span = wrap(root.ownerDocument, range, suggestion.id);
        originals.set(span, cloneChildren(span));
        anchored.set(suggestion.id, span);
      }
      placed = true;
      break;
    }
    if (!placed) missed.set(suggestion.id, 'not_found');
  }

  const blocks = collectBlocks(root);
  for (const suggestion of adds) {
    const after = paragraphForAdd(blocks, suggestion, sections, input.plainText);
    const paragraph = root.ownerDocument.createElement('p');
    paragraph.setAttribute(ANCHOR_ATTR, suggestion.id);
    if (after) after.insertAdjacentElement('afterend', paragraph);
    else root.appendChild(paragraph);
    originals.set(paragraph, root.ownerDocument.createDocumentFragment());
    anchored.set(suggestion.id, paragraph);
  }

  return { anchored, missed, originals };
}

export function cloneChildren(element: HTMLElement): DocumentFragment {
  const fragment = element.ownerDocument.createDocumentFragment();
  for (const child of Array.from(element.childNodes)) fragment.appendChild(child.cloneNode(true));
  return fragment;
}
