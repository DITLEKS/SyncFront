import { ArrowRight, Database, FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { ProjectResponse } from '@/api/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { projectColor } from '@/domain/project/appearance';
import { formatDate, pluralize } from '@/lib/format';

import { ProjectIcon } from './ProjectIcon';

interface ProjectCardProps {
  project: ProjectResponse;
  onRename: (project: ProjectResponse) => void;
  onDelete: (project: ProjectResponse) => void;
}

/**
 * Вся карточка — ссылка на проект; меню лежит поверх ссылки отдельным элементом,
 * поэтому клик по нему не открывает проект. Меню видно при наведении и при фокусе с клавиатуры.
 * Декоративные слои (полоска цвета и градиент) лежат в конце разметки и не участвуют в hit-testing.
 *
 * Цвет рамок — только `border-border` без модификатора прозрачности: токен --border уже содержит
 * альфу, и `border-border/80` даёт невалидный hsl(), который браузер заменяет на currentColor (чёрная рамка).
 * Кольцо фокуса — только при клавиатурном фокусе ссылки.
 */
export function ProjectCard({ project, onRename, onDelete }: ProjectCardProps) {
  const documents = project.document_count;
  const sources = project.source_count;
  const color = projectColor(project);

  return (
    <article className="group relative isolate flex min-h-64 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex flex-1 flex-col px-5 pb-5 pt-6">
        <div className="flex items-start gap-4 pr-8">
          <ProjectIcon
            project={project}
            className="size-12 rounded-xl bg-card shadow-[0_4px_14px_hsl(var(--foreground)/0.06)] ring-1 ring-border"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-base font-semibold leading-6" title={project.name}>
              <Link
                to={`/projects/${project.id}`}
                className="outline-none after:absolute after:inset-0 after:rounded-2xl"
              >
                {project.name}
              </Link>
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Создан {formatDate(project.created_at)}
            </p>
          </div>
        </div>

        <p className="mt-5 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-muted-foreground">
          {project.description || 'Без описания'}
        </p>
      </div>

      <dl className="flex min-h-14 items-center gap-5 border-t border-border bg-card/90 px-5 py-3 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-1.5">
          <FileText className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Документы</dt>
          <dd className="truncate">
            {documents} {pluralize(documents, ['документ', 'документа', 'документов'])}
          </dd>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <Database className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Базовые источники</dt>
          <dd className="truncate">
            {sources} {pluralize(sources, ['источник', 'источника', 'источников'])}
          </dd>
        </div>
        <ArrowRight
          aria-hidden
          className="ml-auto size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground motion-reduce:transition-none"
        />
      </dl>

      <div className="absolute right-3 top-4 z-20 opacity-100 transition-opacity duration-150 md:opacity-0 md:focus-within:opacity-100 md:group-hover:opacity-100 md:has-[[data-state=open]]:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg bg-card/70 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-card hover:text-foreground"
              aria-label={`Действия с проектом ${project.name}`}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onRename(project)}>
              <Pencil aria-hidden />
              Переименовать
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(project)}
            >
              <Trash2 aria-hidden />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `linear-gradient(145deg, ${color}14 0%, ${color}08 45%, transparent 76%)`,
        }}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 z-10 h-0.5"
        style={{ backgroundColor: color }}
        aria-hidden
      />
    </article>
  );
}
