/**
 * Инкрементальный парсер text/event-stream по спецификации WHATWG:
 * поля event / data / id / retry, многострочный data, комментарии (строки с ':'),
 * разделители \n, \r\n и \r. Чанк может оборваться посреди строки — хвост
 * сохраняется до следующего feed().
 */

export interface SseMessage {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

export interface SseParser {
  /** Разобрать очередной фрагмент потока и вернуть завершённые события. */
  feed(chunk: string): SseMessage[];
  /** Сбросить незавершённое состояние (например, при переподключении). */
  reset(): void;
}

export function createSseParser(): SseParser {
  let buffer = '';
  let eventName = '';
  let dataLines: string[] = [];
  let lastId: string | undefined;
  let retry: number | undefined;

  const resetEvent = () => {
    eventName = '';
    dataLines = [];
    retry = undefined;
  };

  const flush = (): SseMessage | null => {
    if (dataLines.length === 0) {
      resetEvent();
      return null;
    }
    const message: SseMessage = {
      event: eventName || 'message',
      data: dataLines.join('\n'),
    };
    if (lastId !== undefined) message.id = lastId;
    if (retry !== undefined) message.retry = retry;
    resetEvent();
    return message;
  };

  const handleLine = (line: string): SseMessage | null => {
    if (line === '') return flush();
    if (line.startsWith(':')) return null;

    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    switch (field) {
      case 'event':
        eventName = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'id':
        if (!value.includes('\0')) lastId = value;
        break;
      case 'retry': {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed >= 0) retry = parsed;
        break;
      }
      default:
        break;
    }
    return null;
  };

  return {
    feed(chunk) {
      buffer += chunk;
      const messages: SseMessage[] = [];
      let newline: number;
      while ((newline = buffer.search(/\r\n|\r|\n/)) !== -1) {
        const line = buffer.slice(0, newline);
        const sepLength = buffer.startsWith('\r\n', newline) ? 2 : 1;
        buffer = buffer.slice(newline + sepLength);
        const message = handleLine(line);
        if (message) messages.push(message);
      }
      return messages;
    },
    reset() {
      buffer = '';
      lastId = undefined;
      resetEvent();
    },
  };
}
