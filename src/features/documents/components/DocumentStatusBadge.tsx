import { type DocumentStatus, statusMeta } from '@/domain/document/status';
import { cn } from '@/lib/cn';

/**
 * Статус документа словом в цвете статуса — без фона, рамки, точки и спиннера.
 * Анимацию идущего анализа показывает AnalysisProgress рядом, дублировать её не нужно.
 */
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
        'inline-flex items-center whitespace-nowrap text-xs font-medium',
        meta.badgeClassName,
        className,
      )}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}
