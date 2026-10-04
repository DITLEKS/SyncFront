import { describe, expect, it } from 'vitest';

import { ApiError, getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('возвращает detail как есть', () => {
    const error = new ApiError(409, { detail: 'Анализ уже выполняется' }, new Headers());
    expect(getErrorMessage(error)).toBe('Анализ уже выполняется');
  });

  it('склеивает ошибки валидации FastAPI, отбрасывая body/query из loc', () => {
    const error = new ApiError(
      422,
      {
        detail: [
          { loc: ['body', 'password'], msg: 'Пароль слишком короткий', type: 'value_error' },
          { loc: ['body', 'email'], msg: 'Некорректный email', type: 'value_error' },
        ],
      },
      new Headers(),
    );
    expect(getErrorMessage(error)).toBe(
      'password: Пароль слишком короткий\nemail: Некорректный email',
    );
  });

  it('добавляет Retry-After к 429', () => {
    const error = new ApiError(429, undefined, new Headers({ 'Retry-After': '42' }));
    expect(getErrorMessage(error)).toContain('через 42 с');
  });

  it('распознаёт обрыв сети', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toMatch(/соединения/);
  });

  it('отдаёт дополнительные поля тела ответа', () => {
    const error = new ApiError(409, { detail: 'x', confirmation_required: true }, new Headers());
    expect(error.extra('confirmation_required')).toBe(true);
  });
});
