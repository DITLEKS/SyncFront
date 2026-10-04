import { FileText, FileType2 } from 'lucide-react';

import { cn } from '@/lib/cn';

export function DocumentFormatIcon({ format, className }: { format: string; className?: string }) {
  const Icon = format === 'docx' ? FileType2 : FileText;
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground',
        className,
      )}
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
}
