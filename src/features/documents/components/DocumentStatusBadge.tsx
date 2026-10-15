import { Loader2 } from 'lucide-react';

import { type DocumentStatus, statusMeta } from '@/domain/document/status';
import { cn } from '@/lib/cn';

/** Статус документа словом в цвете статуса — без фона, рамки и точки-индикатора. */
export function DocumentStatusBadge({
  status,
  className,
}: {
  status: DocumentStatus;
  className?: string;
  /** Точек больше нет; параметр оставлен, чтобы не трогать вызовы из шапки редактора. */
  dot?: boolean;
}) {
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium',
        meta.badgeClassName,
        className,
      )}
      title={meta.description}
    >
      {status === 'in_progress' ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
      {meta.label}
    </span>
  );
}
