/**
 * Мини-график недельной динамики. Чистая геометрия без React: точки в координаты
 * SVG и краткое словесное описание для экранных дикторов.
 */

export interface TrendPoint {
  date: string;
  value: number;
}

export interface SparklineGeometry {
  line: string;
  area: string;
}

/** Координаты линии и заливки в прямоугольнике width×height с отступом padding. */
export function sparklineGeometry(
  values: readonly number[],
  width: number,
  height: number,
  padding = 2,
): SparklineGeometry | null {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = values.length > 1 ? padding + index * step : width / 2;
    // Ровный ряд рисуем посередине, а не прижатым к краю.
    const y = span === 0 ? height / 2 : padding + innerHeight * (1 - (value - min) / span);
    return [round(x), round(y)] as const;
  });

  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const area = first && last ? `${line} L${last[0]} ${height} L${first[0]} ${height} Z` : line;
  return { line, area };
}

export type TrendDirection = 'up' | 'down' | 'flat';

export function trendDirection(values: readonly number[]): TrendDirection {
  const first = values[0];
  const last = values[values.length - 1];
  if (first === undefined || last === undefined || first === last) return 'flat';
  return last > first ? 'up' : 'down';
}

/** Актуальность базы: доля готовых документов. Без документов показатель не определён. */
export function relevanceLabel(percent: number, totalDocuments: number): string {
  if (totalDocuments === 0) return '—';
  return `${Math.round(percent)}\u00a0%`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
