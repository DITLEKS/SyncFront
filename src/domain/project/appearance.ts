/**
 * Внешний вид карточки проекта. Цвет и иконку задаёт сервер, в MVP пользователь их не меняет.
 * Цвет только различает проекты и не несёт статуса.
 * Палитра совпадает с PROJECT_COLORS бэкенда (app/domain/project_appearance.py):
 * цвет вне её сервер отклоняет с 422.
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

/** Цвет из палитры в каноническом виде (без '#', верхний регистр) или null. */
export function normalizeProjectColor(value: string | null | undefined): ProjectColor | null {
  const color = value?.trim().replace(/^#/, '').toUpperCase();
  return (PROJECT_COLORS as readonly string[]).includes(color ?? '')
    ? (color as ProjectColor)
    : null;
}

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
 * Цвет проекта для отображения: сохранённый на сервере, а если его нет (ответ без поля
 * или устаревшее значение) — стабильный цвет палитры по id, чтобы карточка не была серой.
 */
export function projectColor(project: { id: string; color?: string | null }): string {
  const saved = normalizeProjectColor(project.color);
  if (saved) return `#${saved}`;
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
