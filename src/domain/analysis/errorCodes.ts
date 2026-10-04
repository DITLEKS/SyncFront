/**
 * Коды ошибок воркера анализа и подсказки к ним. Текст error_message сервера
 * показывается всегда, подсказка — дополнение, а не замена.
 */

export const ANALYSIS_ERROR_CODES = [
  'LLM_INPUT_TOO_LARGE',
  'LLM_UNAVAILABLE',
  'LLM_INVALID_RESPONSE',
  'DOCUMENT_PARSE_ERROR',
  'GENERATION_ERROR',
  'QUEUE_UNAVAILABLE',
] as const;

export type AnalysisErrorCode = (typeof ANALYSIS_ERROR_CODES)[number];

const HINTS: Record<AnalysisErrorCode, string> = {
  LLM_INPUT_TOO_LARGE:
    'Документ вместе с источником слишком большой для модели. Разбейте источник на части или сократите документ.',
  LLM_UNAVAILABLE: 'Сервис модели недоступен. Повторите анализ позже.',
  LLM_INVALID_RESPONSE: 'Модель вернула некорректный ответ. Повторный запуск обычно помогает.',
  DOCUMENT_PARSE_ERROR: 'Не удалось разобрать документ. Проверьте, что файл не повреждён.',
  GENERATION_ERROR: 'Ошибка при формировании правок. Попробуйте запустить анализ ещё раз.',
  QUEUE_UNAVAILABLE: 'Очередь задач недоступна. Сообщите администратору и повторите позже.',
};

export function analysisErrorHint(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  return (HINTS as Record<string, string>)[code];
}
