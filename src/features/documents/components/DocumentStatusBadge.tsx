import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { type DocumentStatus, statusMeta } from '@/domain/document/status';
import { cn } from '@/lib/cn';

export function DocumentStatusBadge({
  status,
  className,
}: {
  status: DocumentStatus;
  className?: string;
}) {
  const meta = statusMeta[status];
  return (
    <Badge className={cn(meta.badgeClassName, className)} title={meta.description}>
      {status === 'in_progress' ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
      {meta.label}
    </Badge>
  );
}
