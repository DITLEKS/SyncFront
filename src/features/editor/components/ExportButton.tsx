import { ChevronDown, Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button, type ButtonProps } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatLabel } from '@/features/documents';
import { getErrorMessage } from '@/lib/errors';

import { useExportDocument } from '../hooks/useEditor';
import { EDITOR_TEXTS } from '../model/texts';

interface ExportButtonProps {
  projectId: string;
  documentId: string;
  title: string;
  format: string;
  enabled: boolean;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

/** Сервер отдаёт только исходный формат, поэтому в меню один пункт (R-5). */
export function ExportButton({
  projectId,
  documentId,
  title,
  format,
  enabled,
  variant = 'outline',
  size = 'sm',
}: ExportButtonProps) {
  const exporter = useExportDocument(projectId, documentId);
  const extension = formatLabel(format).toLowerCase();

  if (!enabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* У disabled-кнопки нет событий указателя, подсказку вешаем на обёртку. */}
          <span tabIndex={0} className="inline-flex rounded-md">
            <Button size={size} variant={variant} disabled>
              <Download aria-hidden />
              Экспорт
              <ChevronDown aria-hidden className="opacity-60" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{EDITOR_TEXTS.exportDisabled}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} loading={exporter.isPending}>
          <Download aria-hidden />
          Экспорт
          <ChevronDown aria-hidden className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() =>
            exporter.mutate(title, {
              onError: (error) => toast.error(getErrorMessage(error)),
            })
          }
        >
          .{extension}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
