import { Download, ExternalLink, Eye } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { getSourceDownloadUrl } from '@/api/resources/sources';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getErrorMessage } from '@/lib/errors';

import { SourcePreviewDialog, type PreviewableSource } from './SourcePreviewDialog';

interface SourceActionsProps {
  projectId: string;
  source: PreviewableSource;
}

/**
 * «Открыть» и «Скачать» для источника. Ссылка открывается в новой вкладке напрямую;
 * файл показывается текстом в диалоге, а скачивается по presigned-ссылке хранилища.
 */
export function SourceActions({ projectId, source }: SourceActionsProps) {
  const [previewing, setPreviewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const isLink = source.type === 'url';

  const download = async () => {
    setDownloading(true);
    try {
      const { download_url: url } = await getSourceDownloadUrl(projectId, source.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          {isLink && source.url ? (
            <Button asChild variant="ghost" size="iconSm" className="text-muted-foreground">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Открыть ссылку ${source.name}`}
              >
                <ExternalLink aria-hidden />
              </a>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="iconSm"
              className="text-muted-foreground"
              aria-label={`Открыть ${source.name}`}
              onClick={() => setPreviewing(true)}
            >
              <Eye aria-hidden />
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>{isLink ? 'Открыть ссылку' : 'Открыть'}</TooltipContent>
      </Tooltip>
      {!isLink ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="iconSm"
              className="text-muted-foreground"
              aria-label={`Скачать ${source.name}`}
              loading={downloading}
              onClick={() => void download()}
            >
              <Download aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Скачать</TooltipContent>
        </Tooltip>
      ) : null}
      {previewing ? (
        <SourcePreviewDialog
          projectId={projectId}
          source={source}
          open={previewing}
          onOpenChange={setPreviewing}
        />
      ) : null}
    </span>
  );
}
