import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

const STEPS = ['Документ', 'Источники'] as const;

/** Индикатор этапов загрузки; current — индекс с нуля. */
export function UploadStepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-3 text-sm" aria-label="Этапы загрузки">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            className="flex items-center gap-2"
            aria-current={active ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full border text-xs font-medium',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary text-primary',
                !done && !active && 'text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
            </span>
            <span className={cn(active ? 'font-medium' : 'text-muted-foreground')}>{label}</span>
            {index < STEPS.length - 1 ? <span className="h-px w-8 bg-border" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
