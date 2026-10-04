/**
 * Единое место разбора ошибок API: {"detail": string} и валидация FastAPI
 * (422, detail — массив {loc, msg, type}) превращаются в одно сообщение.
 */

export interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export type ErrorBody =
  { detail: string; [extra: string]: unknown } | { detail: ValidationIssue[] } | undefined;

export class ApiError extends Error {
  readonly status: number;
  readonly body: ErrorBody;
  readonly headers: Headers;

  constructor(status: number, body: ErrorBody, headers: Headers, message?: string) {
    super(message ?? detailToMessage(body) ?? `Ошибка запроса (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.headers = headers;
  }

  /** Поле ответа вне detail, например confirmation_required у 409 при повторном анализе. */
  extra(key: string): unknown {
    if (!this.body || Array.isArray(this.body.detail)) return undefined;
    return (this.body as Record<string, unknown>)[key];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function isValidationIssue(value: unknown): value is ValidationIssue {
  return typeof value === 'object' && value !== null && 'msg' in value && 'loc' in value;
}

function detailToMessage(body: ErrorBody): string | undefined {
  if (!body) return undefined;
  const { detail } = body;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const lines = detail.filter(isValidationIssue).map((issue) => {
      // Первый элемент loc — body/query/path, пользователю он не нужен.
      const field = issue.loc.slice(1).join('.');
      return field ? `${field}: ${issue.msg}` : issue.msg;
    });
    if (lines.length > 0) return lines.join('\n');
  }
  return undefined;
}

const STATUS_FALLBACK: Record<number, string> = {
  401: 'Сессия истекла. Войдите заново.',
  403: 'Недостаточно прав для этого действия.',
  404: 'Ресурс не найден или у вас нет к нему доступа.',
  409: 'Действие недопустимо в текущем состоянии.',
  412: 'Данные устарели: документ изменён в другой сессии.',
  413: 'Файл или запрос больше допустимого размера.',
  415: 'Неподдерживаемый формат файла.',
  422: 'Проверьте правильность введённых данных.',
  423: 'Источники заблокированы, пока идёт анализ или ревью документа.',
  429: 'Слишком много запросов. Попробуйте позже.',
  500: 'Внутренняя ошибка сервера. Попробуйте позже.',
};

/** Человекочитаемое сообщение для любой ошибки: API, сеть, неизвестное. */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const server = detailToMessage(error.body);
    if (server) return error.status === 429 ? withRetryAfter(server, error.headers) : server;
    const fallback = STATUS_FALLBACK[error.status] ?? `Ошибка запроса (${error.status}).`;
    return error.status === 429 ? withRetryAfter(fallback, error.headers) : fallback;
  }
  if (error instanceof TypeError) {
    // fetch бросает TypeError при обрыве сети / недоступном сервере
    return 'Нет соединения с сервером. Проверьте сеть и попробуйте снова.';
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Запрос отменён.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Что-то пошло не так. Попробуйте ещё раз.';
}

function withRetryAfter(message: string, headers: Headers): string {
  const seconds = Number(headers.get('Retry-After'));
  if (!Number.isFinite(seconds) || seconds <= 0) return message;
  return `${message} Повторить можно через ${Math.ceil(seconds)} с.`;
}
