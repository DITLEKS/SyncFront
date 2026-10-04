import { describe, expect, it } from 'vitest';

import { createSseParser } from './sseParser';

describe('createSseParser', () => {
  it('разбирает событие бэкенда document_status_changed', () => {
    const parser = createSseParser();
    const messages = parser.feed(
      'event: document_status_changed\ndata: {"document_id":"d1","project_id":"p1","status":"ready","current_analysis_job_id":null}\n\n',
    );
    expect(messages).toEqual([
      {
        event: 'document_status_changed',
        data: '{"document_id":"d1","project_id":"p1","status":"ready","current_analysis_job_id":null}',
      },
    ]);
  });

  it('склеивает чанк, оборванный посреди строки', () => {
    const parser = createSseParser();
    expect(parser.feed('event: pi')).toEqual([]);
    expect(parser.feed('ng\ndata: {}\n')).toEqual([]);
    expect(parser.feed('\n')).toEqual([{ event: 'ping', data: '{}' }]);
  });

  it('объединяет многострочный data и игнорирует комментарии', () => {
    const parser = createSseParser();
    const messages = parser.feed(': keep-alive\ndata: a\ndata: b\n\n');
    expect(messages).toEqual([{ event: 'message', data: 'a\nb' }]);
  });

  it('поддерживает CRLF и несколько событий в одном чанке', () => {
    const parser = createSseParser();
    const messages = parser.feed('event: ping\r\ndata: {}\r\n\r\nid: 7\r\ndata: x\r\n\r\n');
    expect(messages).toEqual([
      { event: 'ping', data: '{}' },
      { event: 'message', data: 'x', id: '7' },
    ]);
  });

  it('пустая строка без data не порождает событие', () => {
    const parser = createSseParser();
    expect(parser.feed('event: ping\n\n')).toEqual([]);
  });

  it('reset() отбрасывает незавершённое событие', () => {
    const parser = createSseParser();
    parser.feed('event: document_status_changed\ndata: {"a":1}');
    parser.reset();
    expect(parser.feed('\n\n')).toEqual([]);
  });
});
