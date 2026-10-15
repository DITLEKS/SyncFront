import type { ChangeType } from '@/domain/editor/suggestion';

import { ChangeTypeLabel } from './ChangeTypeLabel';

/** Бейджи убраны: тип правки везде показывается текстом, как в списке предложений. */
export function ChangeTypeBadge({ type, className }: { type: ChangeType; className?: string }) {
  return <ChangeTypeLabel type={type} className={className} />;
}
