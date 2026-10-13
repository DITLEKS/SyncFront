import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { type DocumentStatus, statusMeta } from '@/domain/document/status';
import { cn } from '@/lib/cn';

export function DocumentStatusBadge({
  status,
  className,
  dot = false,
}: {
  status: DocumentStatus;
  className?: string;
  /** Цветная точка перед текстом — вариант для шапки редактора по макету. */
  dot?: boolean;
}) {
  const meta = statusMeta[status];
  return (
    <Badge className={cn(meta.badgeClassName, className)} title={meta.description}>
      {status === 'in_progress' ? (
        <Loader2 className="size-3 animate-spin" aria-hidden />
      ) : dot ? (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      ) : null}
      {meta.label}
    </Badge>
  );
}
