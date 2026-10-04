import { Lock, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

import { SourceTypeIcon } from './SourceTypeIcon';

export interface SourceListItem {
  id: string;
  name: string;
  type: 'url' | 'file';
  /** Подпись справа: дата добавления, размер файла и т.п. */
  meta?: string;
}

interface SourceListProps {
  items: SourceListItem[];
  onRemove?: (item: SourceListItem) => void;
  removingId?: string | null;
  /** Причина, по которой список доступен только для просмотра. */
  lockedReason?: string;
  className?: string;
}

/**
 * Список источников. Ссылку открыть нельзя: SourceResponse и SourceBadge не содержат url,
 * поэтому показываем только название (см. отчёт шага 2).
 */
export function SourceList({
  items,
  onRemove,
  removingId,
  lockedReason,
  className,
}: SourceListProps) {
  return (
    <ul className={cn('divide-y rounded-md border bg-card', className)}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
          <SourceTypeIcon type={item.type} />
          <span className="min-w-0 flex-1 truncate" title={item.name}>
            {item.name}
          </span>
          {item.meta ? (
            <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
          ) : null}
          {lockedReason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground" tabIndex={0} aria-label={lockedReason}>
                  <Lock className="size-3.5" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent>{lockedReason}</TooltipContent>
            </Tooltip>
          ) : onRemove ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={`Удалить источник ${item.name}`}
              loading={removingId === item.id}
              onClick={() => onRemove(item)}
            >
              <X aria-hidden />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
