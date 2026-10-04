import { describe, expect, it } from 'vitest';

import { parseContentDispositionFilename } from './editor';

describe('parseContentDispositionFilename', () => {
  it('предпочитает filename* в UTF-8', () => {
    expect(
      parseContentDispositionFilename(
        `attachment; filename="Reglament.docx"; filename*=UTF-8''%D0%A0%D0%B5%D0%B3%D0%BB%D0%B0%D0%BC%D0%B5%D0%BD%D1%82.docx`,
      ),
    ).toBe('Регламент.docx');
  });

  it('без filename* берёт filename в кавычках и без них', () => {
    expect(parseContentDispositionFilename('attachment; filename="guide.md"')).toBe('guide.md');
    expect(parseContentDispositionFilename('attachment; filename=guide.txt')).toBe('guide.txt');
  });

  it('битое кодирование filename* — откат на filename', () => {
    expect(
      parseContentDispositionFilename(`attachment; filename="a.md"; filename*=UTF-8''%E0%A4%A`),
    ).toBe('a.md');
  });

  it('нет заголовка или имени — null', () => {
    expect(parseContentDispositionFilename(null)).toBeNull();
    expect(parseContentDispositionFilename('attachment')).toBeNull();
  });
});
