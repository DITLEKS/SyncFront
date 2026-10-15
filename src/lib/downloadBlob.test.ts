import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadBlob } from './downloadBlob';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('downloadBlob', () => {
  it('сохраняет Blob с именем файла, удаляет ссылку и позже освобождает URL', () => {
    vi.useFakeTimers();
    const create = vi.fn().mockReturnValue('blob:test-download');
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('Решение.docx');
      expect(this.getAttribute('href')).toBe('blob:test-download');
      expect(document.body.contains(this)).toBe(true);
      expect(this.target).toBe('');
    });
    const blob = new Blob(['file']);

    downloadBlob(blob, 'Решение.docx');

    expect(create).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(revoke).toHaveBeenCalledWith('blob:test-download');
  });
});
