import { FileText, Link2 } from 'lucide-react';

import { cn } from '@/lib/cn';

/** Заметки сервер хранит как файл .txt, поэтому типов всего два. */
export function SourceTypeIcon({ type, className }: { type: 'url' | 'file'; className?: string }) {
  const Icon = type === 'url' ? Link2 : FileText;
  return (
    <Icon
      className={cn('size-4 shrink-0 text-muted-foreground', className)}
      aria-label={type === 'url' ? 'Ссылка' : 'Файл'}
    />
  );
}
