import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** Иконка перед подписью (декоративная: aria-hidden ставит вызывающий код). */
  icon?: ReactNode;
}

type SegmentedSize = 'sm' | 'md';

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  className?: string;
  /** Подложка активного пункта переезжает с пружинной анимацией (переключатель режимов). */
  sliding?: boolean;
  /** sm — фильтры в панелях, md — переключатель режимов в шапке редактора. */
  size?: SegmentedSize;
}

/** Небольшой перелёт в конце — «пружина» без библиотеки анимаций. */
const SPRING_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const SIZE_CLASS: Record<SegmentedSize, { container: string; button: string; indicator: string }> = {
  sm: { container: 'rounded-lg p-1', button: 'h-7 px-3 text-sm', indicator: 'top-1 h-7' },
  md: { container: 'rounded-xl p-1', button: 'h-9 px-4 text-[15px]', indicator: 'top-1 h-9' },
};

interface IndicatorBox {
  left: number;
  width: number;
}

/**
 * Переключатель с одним активным пунктом (radiogroup): стрелки двигают выбор,
 * Tab заходит только в активный пункт. Используется для фильтров и режимов просмотра.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  sliding = false,
  size = 'sm',
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<IndicatorBox | null>(null);
  const activeIndex = options.findIndex((option) => option.value === value);
  const sizeClass = SIZE_CLASS[size];

  useLayoutEffect(() => {
    if (!sliding) return undefined;
    const measure = () => {
      const button = refs.current[activeIndex];
      // offsetWidth = 0 — разметка ещё не посчитана (или jsdom): остаёмся на обычной подсветке.
      setIndicator(
        button && button.offsetWidth > 0
          ? { left: button.offsetLeft, width: button.offsetWidth }
          : null,
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    const button = refs.current[activeIndex];
    if (button?.parentElement) observer.observe(button.parentElement);
    return () => observer.disconnect();
  }, [sliding, activeIndex, options.length]);

  const slidingReady = sliding && indicator !== null;

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex flex-wrap items-center gap-1 bg-muted',
        sizeClass.container,
        className,
      )}
    >
      {slidingReady ? (
        <span
          aria-hidden
          className={cn(
            'absolute rounded-md bg-card shadow-sm transition-[left,width] duration-500 motion-reduce:transition-none',
            sizeClass.indicator,
          )}
          style={{
            left: indicator.left,
            width: indicator.width,
            transitionTimingFunction: SPRING_EASING,
          }}
        />
      ) : null}
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-200 [&_svg]:size-4 [&_svg]:shrink-0',
              sizeClass.button,
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              active && !slidingReady && 'bg-card shadow-sm',
            )}
          >
            {option.icon}
            {option.label}
            {option.count !== undefined ? (
              <span className="text-xs tabular-nums text-muted-foreground">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
