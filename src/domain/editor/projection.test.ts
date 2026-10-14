import { describe, expect, it } from 'vitest';

import {
  buildProjection,
  exportedText,
  sectionsInUtf16,
  type ChangeSegment,
  type ProjectionInput,
} from './projection';
import type { EditorSuggestion, SuggestionStatus } from './suggestion';

let counter = 0;
function s(
  partial: Partial<EditorSuggestion> & Pick<EditorSuggestion, 'change_type'>,
): EditorSuggestion {
  counter += 1;
  return { id: `s${counter}`, status: 'pending', ...partial };
}

function project(
  text: string,
  suggestions: EditorSuggestion[],
  overrides: Partial<ProjectionInput> = {},
) {
  return buildProjection({
    text,
    sections: [],
    format: 'txt',
    suggestions,
    statusOf: (x) => x.status,
    ...overrides,
  });
}

// ── Эталон: построчный перенос TextExporter / DocxExporter из SyncBack (после PR #78) ──

function mdSections(text: string) {
  const matches = [...text.matchAll(/^(#{1,6})\s+(.+)$/gm)];
  return matches.map((m, i) => ({
    ref: m[2]!.trim(),
    start: m.index ?? 0,
    end: i + 1 < matches.length ? (matches[i + 1]!.index ?? text.length) : text.length,
  }));
}

function insertBlock(text: string, position: number, block: string): string {
  const head = text.slice(0, position).replace(/\n+$/, '');
  const tail = text.slice(position).replace(/^\n+/, '');
  const joined = head ? `${head}\n\n${block}` : block;
  return joined + (tail ? `\n\n${tail}` : '\n');
}

/** Только по якорю: без него или с ненайденным якорем сервер текст не меняет. */
function placeAdditionText(text: string, c: EditorSuggestion): string {
  const block = (c.suggested_text ?? '').replace(/^\n+|\n+$/g, '');
  const anchor = (c.original_text ?? '').trim();
  if (!anchor) return text;
  const index = text.indexOf(anchor);
  if (index === -1) return text;
  const newline = text.indexOf('\n', index + anchor.length);
  return insertBlock(text, newline === -1 ? text.length : newline, block);
}

function serverExport(text: string, accepted: EditorSuggestion[], format: string): string {
  if (format === 'docx') {
    const paragraphs = text.split('\n');
    for (const c of accepted) {
      const old = c.original_text ?? '';
      if (c.change_type !== 'add' && old) {
        const i = paragraphs.findIndex((p) => p.includes(old));
        if (i !== -1) paragraphs[i] = paragraphs[i]!.replace(old, () => c.suggested_text ?? '');
      } else if (c.change_type === 'add' && c.suggested_text) {
        const anchor = old.trim();
        const i = anchor ? paragraphs.findIndex((p) => p.includes(anchor)) : -1;
        if (i !== -1) paragraphs.splice(i + 1, 0, c.suggested_text);
      }
    }
    return paragraphs.join('\n');
  }
  let out = text;
  for (const c of accepted) {
    const old = c.original_text ?? '';
    if (c.change_type === 'modify' && old) out = out.replace(old, () => c.suggested_text ?? '');
    else if (c.change_type === 'delete' && old) out = out.replace(old, '');
    else if (c.change_type === 'add' && c.suggested_text) out = placeAdditionText(out, c);
  }
  return out;
}

const changes = (segments: ReturnType<typeof project>['segments']) =>
  segments.filter((x): x is ChangeSegment => x.kind === 'change');

describe('buildProjection', () => {
  it('размечает первое вхождение modify', () => {
    const m = s({ change_type: 'modify', original_text: 'кот', suggested_text: 'пёс' });
    const result = project('кот и кот', [m]);
    expect(result.segments).toEqual([
      expect.objectContaining({ kind: 'change', id: m.id, oldText: 'кот', newText: 'пёс' }),
      { kind: 'text', text: ' и кот' },
    ]);
    expect(result.located[m.id]).toEqual({ issue: null, exportable: true, inline: true });
  });

  it('помечает ненайденный фрагмент и не показывает его в тексте', () => {
    const m = s({ change_type: 'modify', original_text: 'нет такого', suggested_text: 'x' });
    const result = project('текст', [m]);
    expect(result.located[m.id]).toEqual({ issue: 'not_found', exportable: false, inline: false });
    expect(changes(result.segments)).toHaveLength(0);
  });

  it('ищет следующую правку в тексте с уже принятой предыдущей', () => {
    const first = s({
      change_type: 'modify',
      original_text: 'A',
      suggested_text: 'B',
      status: 'accepted',
    });
    const second = s({ change_type: 'modify', original_text: 'B', suggested_text: 'C' });
    // Сервер сначала заменит A→B, затем второе правило найдёт эту новую B, а не исходную.
    const result = project('A B', [first, second]);
    expect(result.located[second.id]?.issue).toBe('overlap');
  });

  it('у отклонённой правки фрагмент остаётся исходным для следующих правок', () => {
    const first = s({
      change_type: 'modify',
      original_text: 'A',
      suggested_text: 'B',
      status: 'rejected',
    });
    const second = s({ change_type: 'modify', original_text: 'B', suggested_text: 'C' });
    const result = project('A B', [first, second]);
    expect(result.located[second.id]).toEqual({ issue: null, exportable: true, inline: true });
  });

  it('пересечение с соседней правкой помечается как overlap', () => {
    const first = s({ change_type: 'modify', original_text: 'красный дом', suggested_text: 'дом' });
    const second = s({ change_type: 'delete', original_text: 'дом' });
    const result = project('красный дом', [first, second]);
    expect(result.located[second.id]?.issue).toBe('overlap');
  });

  it('modify/delete без original_text и add без suggested_text неприменимы', () => {
    const m = s({ change_type: 'modify', original_text: null, suggested_text: 'x' });
    const a = s({ change_type: 'add', suggested_text: null });
    const result = project('текст', [m, a]);
    expect(result.located[m.id]?.issue).toBe('not_applicable');
    expect(result.located[a.id]?.issue).toBe('not_applicable');
  });

  it('в docx фрагмент из нескольких абзацев неприменим', () => {
    const m = s({ change_type: 'modify', original_text: 'один\nдва', suggested_text: 'x' });
    expect(project('один\nдва', [m], { format: 'docx' }).located[m.id]?.issue).toBe(
      'not_applicable',
    );
    expect(project('один\nдва', [m], { format: 'md' }).located[m.id]?.issue).toBeNull();
  });

  it('предупреждает, если первое вхождение вне указанного раздела', () => {
    const text = '# Вступление\nсрок\n# Сроки\nсрок';
    const sections = [
      { ref: 'Вступление', start_offset: 0, end_offset: text.indexOf('# Сроки') },
      { ref: 'Сроки', start_offset: text.indexOf('# Сроки'), end_offset: text.length },
    ];
    const m = s({
      change_type: 'modify',
      original_text: 'срок',
      suggested_text: 'дата',
      section_ref: 'Сроки',
    });
    expect(project(text, [m], { sections }).located[m.id]?.issue).toBe('outside_section');
  });

  describe('размещение add', () => {
    const text = '# A\nстрока один\nстрока два\n# B\nтекст B';
    const sections = [
      { ref: 'A', start_offset: 0, end_offset: text.indexOf('# B') },
      { ref: 'B', start_offset: text.indexOf('# B'), end_offset: text.length },
    ];

    it('по якорю — сразу после строки с ним, даже если section_ref указывает в другой раздел', () => {
      const add = s({
        change_type: 'add',
        original_text: 'строка один',
        suggested_text: 'новое',
        section_ref: 'B',
      });
      const result = project(text, [add], { sections });
      expect(result.segments).toEqual([
        { kind: 'text', text: '# A\nстрока один' },
        expect.objectContaining({ id: add.id }),
        { kind: 'text', text: '\nстрока два\n# B\nтекст B' },
      ]);
      expect(result.located[add.id]).toEqual({ issue: null, exportable: true, inline: true });
    });

    it('без якоря или с ненайденным якорем — not_found, в тексте не показывается', () => {
      const noAnchor = s({ change_type: 'add', suggested_text: 'новое', section_ref: 'A' });
      const blankAnchor = s({
        change_type: 'add',
        original_text: '   ',
        suggested_text: 'новое',
        section_ref: 'A',
      });
      const missing = s({
        change_type: 'add',
        original_text: 'такого нет',
        suggested_text: 'новое',
        section_ref: 'A',
      });
      const result = project(text, [noAnchor, blankAnchor, missing], { sections });
      for (const add of [noAnchor, blankAnchor, missing]) {
        expect(result.located[add.id]).toEqual({
          issue: 'not_found',
          exportable: false,
          inline: false,
        });
      }
      expect(changes(result.segments)).toHaveLength(0);
      expect(result.segments).toEqual([{ kind: 'text', text }]);
    });

    it('непринятое добавление не мешает поиску следующих правок', () => {
      const add = s({ change_type: 'add', original_text: 'строка один', suggested_text: 'X' });
      const m = s({ change_type: 'modify', original_text: 'строка два', suggested_text: 'Y' });
      const result = project(text, [add, m], { sections });
      expect(result.located[m.id]).toEqual({ issue: null, exportable: true, inline: true });
    });
  });

  it('использует статус из statusOf, а не с сервера', () => {
    const m = s({ change_type: 'modify', original_text: 'a', suggested_text: 'b' });
    const result = project('a', [m], { statusOf: () => 'accepted' });
    expect(changes(result.segments)[0]?.status).toBe('accepted');
  });
});

describe('exportedText совпадает с экспортом сервера', () => {
  const cases: { name: string; format: string; text: string; list: EditorSuggestion[] }[] = [
    {
      name: 'txt: modify, delete; add без якоря не экспортируется',
      format: 'txt',
      text: 'Срок — 10 дней.\nОплата в рублях.\n\nКонец\n\n',
      list: [
        s({
          change_type: 'modify',
          original_text: '10 дней',
          suggested_text: '14 дней',
          status: 'accepted',
        }),
        s({ change_type: 'delete', original_text: 'Оплата в рублях.', status: 'accepted' }),
        s({
          change_type: 'modify',
          original_text: 'Конец',
          suggested_text: 'Финал',
          status: 'rejected',
        }),
        s({ change_type: 'add', suggested_text: 'Приложение 1', status: 'accepted' }),
        s({
          change_type: 'add',
          original_text: 'Конец',
          suggested_text: 'Приложение 2',
          status: 'accepted',
        }),
      ],
    },
    {
      name: 'md: add по якорю внутри раздела; add без якоря пропускается',
      format: 'md',
      text: '# Сроки\nСрок ответа — 10 дней.\nОплата картой.\n\n# Ответственность\nСтороны несут ответственность.\n',
      list: [
        s({
          change_type: 'add',
          original_text: 'Срок ответа — 10 дней.',
          suggested_text: 'Срок может быть продлён.',
          section_ref: 'Сроки',
          status: 'accepted',
        }),
        s({
          change_type: 'add',
          suggested_text: 'Возможна оплата по счёту.',
          section_ref: 'Сроки',
          status: 'accepted',
        }),
        s({
          change_type: 'modify',
          original_text: 'несут ответственность',
          suggested_text: 'отвечают',
          status: 'accepted',
        }),
      ],
    },
    {
      name: 'md: повторяющийся фрагмент, заменяется первое вхождение',
      format: 'md',
      text: '# Раздел\nдоговор и договор\n',
      list: [
        s({
          change_type: 'modify',
          original_text: 'договор',
          suggested_text: 'соглашение',
          status: 'accepted',
        }),
        s({
          change_type: 'modify',
          original_text: 'договор',
          suggested_text: 'контракт',
          status: 'accepted',
        }),
      ],
    },
    {
      name: 'docx: абзацы, удаление; add без якоря пропускается',
      format: 'docx',
      text: 'Первый абзац\nВторой абзац\nТретий',
      list: [
        s({
          change_type: 'modify',
          original_text: 'Второй',
          suggested_text: '2-й',
          status: 'accepted',
        }),
        s({ change_type: 'delete', original_text: 'Третий', status: 'accepted' }),
        s({
          change_type: 'modify',
          original_text: 'Первый',
          suggested_text: '1-й',
          status: 'pending',
        }),
        s({ change_type: 'add', suggested_text: 'Новый', status: 'accepted' }),
      ],
    },
    {
      name: 'docx: добавление после абзаца с якорем',
      format: 'docx',
      text: 'Первый абзац\nВторой абзац\nТретий',
      list: [
        s({
          change_type: 'add',
          original_text: 'Первый абзац',
          suggested_text: 'Вставка',
          status: 'accepted',
        }),
      ],
    },
    {
      name: 'спецсимволы замены $& не интерпретируются',
      format: 'txt',
      text: 'цена 5',
      list: [
        s({
          change_type: 'modify',
          original_text: '5',
          suggested_text: '$& руб.',
          status: 'accepted',
        }),
      ],
    },
  ];

  it.each(cases)('$name', ({ format, text, list }) => {
    const sections = mdSections(text).map((x) => ({
      ref: x.ref,
      start_offset: x.start,
      end_offset: x.end,
    }));
    const projection = project(text, list, { format, sections });
    const accepted = list.filter((x) => x.status === 'accepted');
    expect(exportedText(projection, format)).toBe(serverExport(text, accepted, format));
  });

  it('совпадает при переключении решений через statusOf', () => {
    const text = 'a b c';
    const list = [
      s({ change_type: 'modify', original_text: 'a', suggested_text: 'A' }),
      s({ change_type: 'delete', original_text: ' c' }),
    ];
    const statuses: Record<string, SuggestionStatus> = {
      [list[0]!.id]: 'rejected',
      [list[1]!.id]: 'accepted',
    };
    const projection = project(text, list, { statusOf: (x) => statuses[x.id] ?? 'pending' });
    expect(exportedText(projection, 'txt')).toBe('a b');
  });
});

describe('sectionsInUtf16', () => {
  it('без суррогатных пар офсеты не меняются', () => {
    const sections = [{ ref: 'a', start_offset: 1, end_offset: 3 }];
    expect(sectionsInUtf16('abc', sections)).toEqual(sections);
  });

  it('пересчитывает кодовые точки Python в индексы UTF-16', () => {
    // «😀» — одна кодовая точка, но две единицы UTF-16.
    const text = '😀# A\nx';
    const result = sectionsInUtf16(text, [{ ref: 'A', start_offset: 1, end_offset: 6 }]);
    expect(result[0]).toEqual({ ref: 'A', start_offset: 2, end_offset: 7 });
  });
});
