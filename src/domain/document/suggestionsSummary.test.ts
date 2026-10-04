import { describe, expect, it } from 'vitest';

import { suggestionsSummary } from './suggestionsSummary';

describe('suggestionsSummary', () => {
  it('прочерк без правок', () => {
    expect(suggestionsSummary({ total: 0, pending: 0, accepted: 0, rejected: 0 })).toEqual({
      kind: 'none',
    });
  });

  it('доля рассмотренных', () => {
    expect(suggestionsSummary({ total: 4, pending: 1, accepted: 2, rejected: 1 })).toEqual({
      kind: 'some',
      total: 4,
      resolved: 3,
      progress: 0.75,
    });
  });
});
