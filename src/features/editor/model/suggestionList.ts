/**
 * Стратегия рендера списка предложений: короткие списки рисуются целиком,
 * длинные — виртуально, чтобы тысячи карточек не попадали в DOM.
 */
export const VIRTUALIZE_FROM = 100;

/** Оценка высоты карточки до измерения; реальная высота берётся из DOM. */
export const ESTIMATED_CARD_HEIGHT = 104;

/** Сколько карточек дорисовывать за границами видимой области. */
export const LIST_OVERSCAN = 8;

/**
 * Высота окна прокрутки, пока контейнер не измерен (скрыт, ещё не размещён, jsdom):
 * без неё виртуализатор не рисует ни одной карточки.
 */
export const FALLBACK_VIEWPORT_HEIGHT = ESTIMATED_CARD_HEIGHT * 6;

export function isVirtualized(count: number): boolean {
  return count > VIRTUALIZE_FROM;
}
