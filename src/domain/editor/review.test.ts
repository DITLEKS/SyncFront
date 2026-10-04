import { describe, expect, it } from 'vitest';

import { effectiveStatus, planSave, reviewProgress } from './review';

const list = [
  { id: 'a', status: 'pending' as const },
  { id: 'b', status: 'pending' as const },
  { id: 'c', status: 'accepted' as const },
];

describe('effectiveStatus', () => {
  it('буфер действует только на pending', () => {
    expect(effectiveStatus(list[0]!, { a: 'rejected' })).toBe('rejected');
    expect(effectiveStatus(list[2]!, { c: 'rejected' })).toBe('accepted');
    expect(effectiveStatus(list[1]!, {})).toBe('pending');
  });
});

describe('planSave', () => {
  it('finalize=false, пока остаются pending', () => {
    expect(planSave(list, { a: 'accepted' }, 2)).toEqual({
      decisions: [{ suggestion_id: 'a', decision: 'accepted' }],
      finalize: false,
      stale: [],
    });
  });

  it('finalize=true, когда решены все pending', () => {
    expect(planSave(list, { a: 'accepted', b: 'rejected' }, 2).finalize).toBe(true);
  });

  it('учитывает незагруженные pending из полного счётчика', () => {
    expect(planSave(list, { a: 'accepted', b: 'rejected' }, 5).finalize).toBe(false);
  });

  it('отбрасывает решения по правкам, уже решённым или исчезнувшим на сервере', () => {
    const plan = planSave(list, { a: 'accepted', c: 'rejected', gone: 'accepted' }, 2);
    expect(plan.decisions).toEqual([{ suggestion_id: 'a', decision: 'accepted' }]);
    expect(plan.stale).toEqual(['c', 'gone']);
  });

  it('пустой буфер при нуле pending завершает ревью', () => {
    expect(planSave([{ id: 'c', status: 'accepted' }], {}, 0)).toEqual({
      decisions: [],
      finalize: true,
      stale: [],
    });
  });
});

describe('reviewProgress', () => {
  it('сдвигает серверные счётчики на решения буфера', () => {
    const counters = { total: 3, pending: 2, accepted: 1, rejected: 0 };
    expect(reviewProgress(counters, list, { a: 'rejected' })).toEqual({
      total: 3,
      pending: 1,
      accepted: 1,
      rejected: 1,
      decided: 2,
      percent: 67,
    });
  });

  it('без правок — 100%', () => {
    expect(reviewProgress({ total: 0, pending: 0, accepted: 0, rejected: 0 }, [], {}).percent).toBe(
      100,
    );
  });
});
