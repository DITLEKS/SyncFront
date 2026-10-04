/**
 * Внешний вид карточки проекта. Цвет только различает проекты и не несёт статуса.
 * Палитра совпадает с PROJECT_COLORS бэкенда (app/api/schemas/project.py).
 */

export const PROJECT_COLORS = [
  '3B82F6',
  '8B5CF6',
  '10B981',
  'F59E0B',
  'EF4444',
  'EC4899',
  '14B8A6',
  'F97316',
] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number];

const HEX6 = /^[0-9A-Fa-f]{6}$/;

/** Стабильный хеш строки (FNV-1a), чтобы цвет не менялся между перезагрузками. */
function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

/**
 * Цвет проекта: значение сервера, если оно валидно, иначе детерминированный цвет из палитры по id.
 * Сервер пока не сохраняет color, поэтому запасной вариант — основной путь.
 */
export function projectColor(project: { id: string; color?: string | null }): string {
  if (project.color && HEX6.test(project.color)) return `#${project.color.toUpperCase()}`;
  const index = hash(project.id) % PROJECT_COLORS.length;
  return `#${PROJECT_COLORS[index] ?? PROJECT_COLORS[0]}`;
}

/** Набор Lucide-иконок, доступных в интерфейсе; полный каталог не тянем в бандл. */
export const PROJECT_ICON_NAMES = [
  'folder-kanban',
  'book-open',
  'file-code',
  'server',
  'shield',
  'rocket',
  'boxes',
  'cloud',
  'database',
  'workflow',
  'globe',
  'cpu',
] as const;

export type ProjectIconName = (typeof PROJECT_ICON_NAMES)[number];

export type ProjectIcon =
  | { kind: 'lucide'; name: ProjectIconName }
  | { kind: 'emoji'; value: string }
  | { kind: 'default' };

/** Преобразует строку с сервера: Lucide-имя (kebab или PascalCase), emoji или пусто. */
export function resolveProjectIcon(icon: string | null | undefined): ProjectIcon {
  const value = icon?.trim();
  if (!value) return { kind: 'default' };
  const kebab = value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
  if ((PROJECT_ICON_NAMES as readonly string[]).includes(kebab)) {
    return { kind: 'lucide', name: kebab as ProjectIconName };
  }
  // Всё, что не похоже на ASCII-идентификатор, считаем emoji/символом.
  if (/^[\w-]+$/.test(value)) return { kind: 'default' };
  return { kind: 'emoji', value: Array.from(value).slice(0, 2).join('') };
}
