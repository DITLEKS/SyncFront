import { describe, expect, it } from 'vitest';

import {
  normalizeProjectColor,
  PROJECT_COLORS,
  projectColor,
  resolveProjectIcon,
} from './appearance';

describe('projectColor', () => {
  it('берёт цвет сервера, если он валиден', () => {
    expect(projectColor({ id: 'a', color: '10b981' })).toBe('#10B981');
  });

  it('без цвета выбирает стабильный цвет из палитры', () => {
    const first = projectColor({ id: 'project-1', color: null });
    expect(projectColor({ id: 'project-1' })).toBe(first);
    expect(PROJECT_COLORS.map((c) => `#${c}`)).toContain(first);
  });

  it('игнорирует цвет вне палитры', () => {
    expect(projectColor({ id: 'x', color: 'red' })).toMatch(/^#[0-9A-F]{6}$/);
    expect(projectColor({ id: 'x', color: '123456' })).not.toBe('#123456');
  });
});

describe('normalizeProjectColor', () => {
  it.each([
    ['#ec4899', 'EC4899'],
    [' 3b82f6 ', '3B82F6'],
    ['123456', null],
    ['', null],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(normalizeProjectColor(input)).toBe(expected);
  });
});

describe('resolveProjectIcon', () => {
  it.each([
    ['rocket', { kind: 'lucide', name: 'rocket' }],
    ['BookOpen', { kind: 'lucide', name: 'book-open' }],
    ['📘', { kind: 'emoji', value: '📘' }],
    ['unknown-icon', { kind: 'default' }],
    [null, { kind: 'default' }],
    ['  ', { kind: 'default' }],
  ])('%s → %o', (input, expected) => {
    expect(resolveProjectIcon(input)).toEqual(expected);
  });
});
