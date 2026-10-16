import { describe, expect, it } from 'vitest';

import { buildProjection } from './projection';
import type { EditorSuggestion } from './suggestion';

const suggestion = (
  id: string,
  change_type: EditorSuggestion['change_type'],
  original_text: string,
): EditorSuggestion => ({
  id,
  change_type,
  original_text,
  suggested_text: change_type === 'delete' ? null : 'новый текст',
  status: 'pending',
});

describe('buildProjection: originOffset', () => {
  it('сохраняет исходные позиции и null для непривязанной правки', () => {
    const later = suggestion('later', 'modify', 'конец');
    const earlier = suggestion('earlier', 'delete', 'начало');
    const missing = suggestion('missing', 'modify', 'нет');
    const result = buildProjection({
      text: 'начало и конец',
      sections: [],
      format: 'txt',
      suggestions: [later, earlier, missing],
      statusOf: (item) => item.status,
    });

    expect(result.located[later.id]?.originOffset).toBe(9);
    expect(result.located[earlier.id]?.originOffset).toBe(0);
    expect(result.located[missing.id]?.originOffset).toBeNull();
  });

  it('использует позицию конца строки с якорем для add', () => {
    const add = suggestion('add', 'add', 'первая строка');
    const result = buildProjection({
      text: 'первая строка\nвторая строка',
      sections: [],
      format: 'txt',
      suggestions: [add],
      statusOf: (item) => item.status,
    });

    expect(result.located[add.id]?.originOffset).toBe('первая строка'.length);
  });
});
