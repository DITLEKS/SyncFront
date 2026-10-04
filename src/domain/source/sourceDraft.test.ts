import { describe, expect, it } from 'vitest';

import { defaultSourceName, validateSourceUrl } from './sourceDraft';

describe('validateSourceUrl', () => {
  it.each([
    ['https://confluence.example.com/page/1', null],
    ['http://jira.example.com', null],
    ['', 'Укажите ссылку'],
    ['ftp://example.com/file', 'Поддерживаются только ссылки http и https'],
    ['not a url', 'Некорректная ссылка'],
  ])('%s', (input, expected) => {
    expect(validateSourceUrl(input)).toBe(expected);
  });
});

describe('defaultSourceName', () => {
  it('строит имя из ссылки', () => {
    expect(defaultSourceName({ url: 'https://wiki.example.com/release/2.0' })).toBe(
      'wiki.example.com/release/2.0',
    );
    expect(defaultSourceName({ url: 'https://example.com/' })).toBe('example.com');
  });

  it('берёт имя файла', () => {
    expect(defaultSourceName({ file: new File(['x'], 'notes.md') })).toBe('notes.md');
  });
});
