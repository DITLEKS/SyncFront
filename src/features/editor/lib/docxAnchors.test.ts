import { describe, expect, it } from 'vitest';

import type { DocumentSection } from '@/domain/editor/projection';
import type { EditorSuggestion } from '@/domain/editor/suggestion';

import { ANCHOR_ATTR, anchorSuggestions } from './docxAnchors';

let counter = 0;
function s(
  partial: Partial<EditorSuggestion> & Pick<EditorSuggestion, 'change_type'>,
): EditorSuggestion {
  counter += 1;
  return { id: `s${counter}`, status: 'pending', ...partial };
}

function host(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

const anchorOf = (root: HTMLElement, id: string) =>
  root.querySelector<HTMLElement>(`[${ANCHOR_ATTR}="${id}"]`);

const run = (
  root: HTMLElement,
  suggestions: EditorSuggestion[],
  plainText = '',
  sections: DocumentSection[] = [],
) => anchorSuggestions(root, { suggestions, sections, plainText });

describe('anchorSuggestions', () => {
  it('оборачивает первое вхождение внутри абзаца и не трогает остальной текст', () => {
    const root = host('<p>Срок — 10 дней. Ещё 10 дней.</p>');
    const m = s({ change_type: 'modify', original_text: '10 дней', suggested_text: '14 дней' });
    const report = run(root, [m]);
    const anchor = anchorOf(root, m.id);
    expect(report.anchored.get(m.id)).toBe(anchor);
    expect(anchor?.textContent).toBe('10 дней');
    expect(root.textContent).toBe('Срок — 10 дней. Ещё 10 дней.');
    expect(root.querySelectorAll(`[${ANCHOR_ATTR}]`)).toHaveLength(1);
  });

  it('сохраняет форматирование ранов, когда фрагмент пересекает их границу', () => {
    const root = host('<p><span style="font-weight:bold">Жирный</span> и обычный текст</p>');
    const m = s({ change_type: 'delete', original_text: 'ный и обыч' });
    run(root, [m]);
    const anchor = anchorOf(root, m.id);
    expect(anchor?.textContent).toBe('ный и обыч');
    expect(anchor?.querySelector('span')?.textContent).toBe('ный');
    expect(root.textContent).toBe('Жирный и обычный текст');
  });

  it('ищет в ячейках таблиц так же, как в абзацах', () => {
    const root = host('<table><tr><td><p>Цена</p></td><td><p>100 руб.</p></td></tr></table>');
    const m = s({ change_type: 'modify', original_text: '100 руб.', suggested_text: '120 руб.' });
    run(root, [m]);
    expect(anchorOf(root, m.id)?.closest('td')).not.toBeNull();
  });

  it('не ищет через границу абзаца и помечает отсутствие фрагмента', () => {
    const root = host('<p>Первый</p><p>Второй</p>');
    const multi = s({
      change_type: 'modify',
      original_text: 'Первый\nВторой',
      suggested_text: 'x',
    });
    const cross = s({ change_type: 'modify', original_text: 'ПервыйВторой', suggested_text: 'x' });
    const report = run(root, [multi, cross]);
    expect(report.missed.get(multi.id)).toBe('not_applicable');
    expect(report.missed.get(cross.id)).toBe('not_found');
  });

  it('неразрывный пробел в документе совпадает с обычным в правке', () => {
    const root = host('<p>10&nbsp;дней</p>');
    const m = s({ change_type: 'modify', original_text: '10 дней', suggested_text: 'x' });
    const report = run(root, [m]);
    expect(report.anchored.has(m.id)).toBe(true);
  });

  it('пересечение с уже привязанной правкой — overlap, обёртка не создаётся', () => {
    const root = host('<p>красный дом</p>');
    const first = s({ change_type: 'modify', original_text: 'красный дом', suggested_text: 'дом' });
    const second = s({ change_type: 'delete', original_text: 'дом' });
    const report = run(root, [first, second]);
    expect(report.anchored.has(first.id)).toBe(true);
    expect(report.missed.get(second.id)).toBe('overlap');
    expect(root.querySelectorAll(`[${ANCHOR_ATTR}]`)).toHaveLength(1);
  });

  it('добавление вставляется после последнего абзаца раздела, иначе — в конец', () => {
    const root = host('<p>Раздел A</p><p>текст A</p><p>Раздел B</p><p>текст B</p>');
    const plainText = 'Раздел A\nтекст A\nРаздел B\nтекст B';
    const sections = [
      { ref: 'A', start_offset: 0, end_offset: plainText.indexOf('Раздел B') },
      { ref: 'B', start_offset: plainText.indexOf('Раздел B'), end_offset: plainText.length },
    ];
    const inSection = s({ change_type: 'add', suggested_text: 'новое', section_ref: 'A' });
    const orphan = s({ change_type: 'add', suggested_text: 'ещё' });
    const report = run(root, [inSection, orphan], plainText, sections);
    const paragraphs = Array.from(root.children);
    expect(paragraphs[2]).toBe(report.anchored.get(inSection.id));
    expect(paragraphs.at(-1)).toBe(report.anchored.get(orphan.id));
  });

  it('исходное содержимое якоря сохраняется для отрисовки', () => {
    const root = host('<p>a <b>b</b> c</p>');
    const m = s({ change_type: 'modify', original_text: 'a b', suggested_text: 'x' });
    const report = run(root, [m]);
    const anchor = report.anchored.get(m.id);
    const original = anchor ? report.originals.get(anchor) : undefined;
    expect(original?.textContent).toBe('a b');
    expect(original?.querySelector('b')?.textContent).toBe('b');
  });
});
