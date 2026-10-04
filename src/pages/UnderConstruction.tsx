import { Hammer } from 'lucide-react';

/** Заглушка раздела до соответствующего шага плана работ (см. README, «План»). */
export function UnderConstruction({ step }: { step: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
      <Hammer className="mb-3 size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">Раздел в разработке</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{step}</p>
    </div>
  );
}
