import { changeTypeMeta, type ChangeType } from '@/domain/editor/suggestion';
import { cn } from '@/lib/cn';

const textClass = {
  amber: 'text-amber-700',
  emerald: 'text-emerald-700',
  red: 'text-red-700',
} as const;

/** Тип правки — название капителью в цвете типа, без точки и бейджа. */
export function ChangeTypeLabel({ type, className }: { type: ChangeType; className?: string }) {
  const meta = changeTypeMeta[type];
  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-semibold uppercase tracking-wide',
        textClass[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
