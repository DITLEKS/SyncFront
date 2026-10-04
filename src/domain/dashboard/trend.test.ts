import { describe, expect, it } from 'vitest';

import { relevanceLabel, sparklineGeometry, trendDirection } from './trend';

describe('sparklineGeometry', () => {
  it('растягивает ряд по ширине и переворачивает ось Y', () => {
    const geometry = sparklineGeometry([0, 10], 100, 20, 0);
    expect(geometry?.line).toBe('M0 20 L100 0');
    expect(geometry?.area).toBe('M0 20 L100 0 L100 20 L0 20 Z');
  });

  it('ровный ряд рисует посередине, пустой — не рисует', () => {
    expect(sparklineGeometry([5, 5, 5], 100, 20, 0)?.line).toBe('M0 10 L50 10 L100 10');
    expect(sparklineGeometry([], 100, 20)).toBeNull();
  });

  it('одну точку ставит в центр', () => {
    expect(sparklineGeometry([3], 100, 20, 0)?.line).toBe('M50 10');
  });
});

describe('trendDirection', () => {
  it('сравнивает первую и последнюю точку недели', () => {
    expect(trendDirection([1, 5, 3])).toBe('up');
    expect(trendDirection([4, 1])).toBe('down');
    expect(trendDirection([2, 9, 2])).toBe('flat');
    expect(trendDirection([])).toBe('flat');
  });
});

describe('relevanceLabel', () => {
  it('округляет процент и не показывает 0 % при пустой базе', () => {
    expect(relevanceLabel(66.666, 3)).toBe('67\u00a0%');
    expect(relevanceLabel(0, 0)).toBe('—');
  });
});
