import { useSyncExternalStore } from 'react';

const noop = () => {};

function supported(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/**
 * Подписка на media query без лишних перерисовок. В jsdom matchMedia нет —
 * хук возвращает false, и разметка остаётся «мобильной» (нижняя ветка layout).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (!supported()) return noop;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => (supported() ? window.matchMedia(query).matches : false),
    () => false,
  );
}
