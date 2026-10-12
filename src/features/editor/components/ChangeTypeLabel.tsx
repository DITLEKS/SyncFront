import { changeTypeMeta, type ChangeType } from '@/domain/editor/suggestion';
import { cn } from '@/lib/cn';

const dotClass = {
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
} as const;

const textClass = {
  amber: 'text-amber-700',
  emerald: 'text-emerald-700',
  red: 'text-red-700',
} as const;

/** Метка типа правки как в макетах: цветная точка и название капителью. */
export function ChangeTypeLabel({ type, className }: { type: ChangeType; className?: string }) {
  const meta = changeTypeMeta[type];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide',
        textClass[meta.tone],
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', dotClass[meta.tone])} />
      {meta.label}
    </span>
  );
}
