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
    addPlacement: 'end',
    ...overrides,
  });
}

/** Эталон: построчный перенос TextExporter/DocxExporter из SyncBack. */
function serverExport(text: string, accepted: EditorSuggestion[], format: string): string {
  if (format === 'docx') {
    const paragraphs = text.split('\n');
    for (const c of accepted) {
      const old = c.original_text ?? '';
      if (c.change_type !== 'add' && old) {
        const i = paragraphs.findIndex((p) => p.includes(old));
        if (i !== -1) paragraphs[i] = paragraphs[i]!.replace(old, c.suggested_text ?? '');
      } else if (c.change_type === 'add' && c.suggested_text) {
        paragraphs.push(c.suggested_text);
      }
    }
    return paragraphs.join('\n');
  }
  let out = text;
  for (const c of accepted) {
    const old = c.original_text ?? '';
    if (c.change_type === 'modify' && old) out = out.replace(old, () => c.suggested_text ?? '');
    else if (c.change_type === 'delete' && old) out = out.replace(old, '');
    else if (c.change_type === 'add' && c.suggested_text)
      out = `${out.replace(/\n+$/, '')}\n\n${c.suggested_text}\n`;
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

  it('add по умолчанию — в конце документа, в режиме section — в конце раздела', () => {
    const text = '# A\nтекст A\n# B\nтекст B';
    const sections = [
      { ref: 'A', start_offset: 0, end_offset: text.indexOf('# B') },
      { ref: 'B', start_offset: text.indexOf('# B'), end_offset: text.length },
    ];
    const add = s({ change_type: 'add', suggested_text: 'новое', section_ref: 'A' });
    const atEnd = project(text, [add], { sections });
    expect(atEnd.segments.at(-1)).toEqual(expect.objectContaining({ id: add.id }));
    const inSection = project(text, [add], { sections, addPlacement: 'section' });
    expect(inSection.segments).toEqual([
      { kind: 'text', text: '# A\nтекст A\n' },
      expect.objectContaining({ id: add.id }),
      { kind: 'text', text: '# B\nтекст B' },
    ]);
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
      name: 'txt: modify, delete, add',
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
        s({ change_type: 'add', suggested_text: 'Приложение 2', status: 'accepted' }),
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
      name: 'docx: абзацы, удаление и добавление',
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
    const projection = project(text, list, { format });
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
