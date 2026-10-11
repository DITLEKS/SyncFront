import { describe, expect, it } from 'vitest';

import { isVirtualized, VIRTUALIZE_FROM } from './suggestionList';

describe('выбор стратегии рендера списка предложений', () => {
  it('списки до порога включительно рендерятся целиком', () => {
    expect(isVirtualized(0)).toBe(false);
    expect(isVirtualized(1)).toBe(false);
    expect(isVirtualized(VIRTUALIZE_FROM)).toBe(false);
  });

  it('списки длиннее порога виртуализируются', () => {
    expect(isVirtualized(VIRTUALIZE_FROM + 1)).toBe(true);
    expect(isVirtualized(2000)).toBe(true);
  });
});
