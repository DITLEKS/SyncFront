import { Badge } from '@/components/ui/badge';
import { changeTypeMeta, type ChangeType } from '@/domain/editor/suggestion';
import { cn } from '@/lib/cn';

const toneClass = {
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  red: 'bg-red-50 text-red-800 ring-red-200',
} as const;

export function ChangeTypeBadge({ type, className }: { type: ChangeType; className?: string }) {
  const meta = changeTypeMeta[type];
  return <Badge className={cn(toneClass[meta.tone], className)}>{meta.label}</Badge>;
}
