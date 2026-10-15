import { Lock, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';

import { SourceActions } from './SourceActions';
import { SourceTypeIcon } from './SourceTypeIcon';

export interface SourceListItem {
  id: string;
  name: string;
  type: 'url' | 'file';
  /** Адрес url-источника; есть в SourceResponse и в бейдже источника после SyncBack#86. */
  url?: string | null;
  /** Дата добавления; показывается справа от названия, если не задана meta. */
  created_at?: string | null;
  /** Подпись справа вместо даты: размер файла и т.п. */
  meta?: string;
}

interface SourceListProps {
  items: SourceListItem[];
  /** Проект, которому принадлежат источники: включает кнопки «Открыть» и «Скачать». */
  projectId?: string;
  onRemove?: (item: SourceListItem) => void;
  removingId?: string | null;
  /** Причина, по которой список доступен только для просмотра. */
  lockedReason?: string;
  className?: string;
}

/** Список источников: тип, название, дата добавления, просмотр, скачивание и удаление. */
export function SourceList({
  items,
  projectId,
  onRemove,
  removingId,
  lockedReason,
  className,
}: SourceListProps) {
  return (
    <ul className={cn('divide-y rounded-md border bg-card', className)}>
      {items.map((item) => {
        const meta = item.meta ?? (item.created_at ? formatDate(item.created_at) : null);
        return (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <SourceTypeIcon type={item.type} />
            <span className="min-w-0 flex-1 truncate" title={item.name}>
              {item.name}
            </span>
            {meta ? (
              <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                {meta}
              </span>
            ) : null}
            {projectId ? <SourceActions projectId={projectId} source={item} /> : null}
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
        );
      })}
    </ul>
  );
}
