import { ArrowRight, FileText, FolderKanban, Upload, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { UploadDocumentDialog } from '@/features/documents';
import { cn } from '@/lib/cn';

const TILE_CLASS =
  'group flex w-full items-center gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0';

function TileContent({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <ArrowRight
        className={cn(
          'size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:text-primary group-hover:opacity-100',
        )}
        aria-hidden
      />
    </>
  );
}

export function QuickActions() {
  const [uploadOpen, setUploadOpen] = useState(false);
  return (
    <section aria-labelledby="quick-actions-title" className="space-y-3">
      <h2 id="quick-actions-title" className="text-base font-semibold">
        Быстрые действия
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        <li>
          <Link to="/documents" className={TILE_CLASS}>
            <TileContent
              icon={FileText}
              title="Все документы"
              description="Документы из всех проектов"
            />
          </Link>
        </li>
        <li>
          <Link to="/projects" className={TILE_CLASS}>
            <TileContent icon={FolderKanban} title="Мои проекты" description="Список проектов" />
          </Link>
        </li>
        <li>
          <button type="button" className={TILE_CLASS} onClick={() => setUploadOpen(true)}>
            <TileContent icon={Upload} title="Загрузить" description="Новый документ на анализ" />
          </button>
        </li>
      </ul>
      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </section>
  );
}
