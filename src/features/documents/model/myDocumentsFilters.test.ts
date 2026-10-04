import { describe, expect, it } from 'vitest';

import { emptyReason, filtersToParams, parseFilters } from './myDocumentsFilters';

describe('фильтры «Моих документов»', () => {
  it('читает и пишет URL', () => {
    const filters = parseFilters(new URLSearchParams('status=awaiting_approval&q=api&page=2'));
    expect(filters).toEqual({ status: 'awaiting_approval', query: 'api', page: 2 });
    expect(filtersToParams(filters).toString()).toBe('status=awaiting_approval&q=api&page=2');
  });

  it('неизвестный статус и мусор в page игнорируются', () => {
    expect(parseFilters(new URLSearchParams('status=failed&page=-3'))).toEqual({
      status: 'all',
      query: '',
      page: 1,
    });
  });

  it('выбирает текст пустого состояния', () => {
    expect(emptyReason({ status: 'all', query: '' }, 0)).toBe('no_documents');
    expect(emptyReason({ status: 'ready', query: '' }, 5)).toBe('empty_category');
    expect(emptyReason({ status: 'ready', query: 'x' }, 5)).toBe('nothing_found');
  });
});
