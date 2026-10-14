import { describe, expect, it } from 'vitest';

import { planSave } from './review';

const pending = (id: string) => ({ id, status: 'pending' as const });

describe('planSave с отредактированным текстом', () => {
  it('прикрепляет edited_text к принятой правке', () => {
    const plan = planSave([pending('a')], { a: 'accepted' }, 1, { a: 'новый текст' });
    expect(plan.decisions).toEqual([
      { suggestion_id: 'a', decision: 'accepted', edited_text: 'новый текст' },
    ]);
  });

  it('для отклонённой правки текст не отправляется', () => {
    const plan = planSave([pending('a')], { a: 'rejected' }, 1, { a: 'игнор' });
    expect(plan.decisions).toEqual([{ suggestion_id: 'a', decision: 'rejected' }]);
    expect(plan.decisions[0]).not.toHaveProperty('edited_text');
  });

  it('без правки ключа edited_text нет — тело запроса не меняется', () => {
    const plan = planSave([pending('a')], { a: 'accepted' }, 1);
    expect(plan.decisions[0]).not.toHaveProperty('edited_text');
  });
});
