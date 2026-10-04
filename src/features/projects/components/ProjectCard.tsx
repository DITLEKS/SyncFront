import { ArrowRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { ProjectResponse } from '@/api/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
 */
export function ProjectCard({ project, onRename, onDelete }: ProjectCardProps) {
  const documents = project.document_count;
  const sources = project.source_count;
  return (
    <article className="group relative flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-ring hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0">
      <div className="flex items-start gap-3 pr-8">
        <ProjectIcon project={project} />
        <div className="min-w-0">
          <h3 className="truncate font-semibold" title={project.name}>
            <Link
              to={`/projects/${project.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-xl"
            >
              {project.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Создан {formatDate(project.created_at)}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {project.description || 'Без описания'}
      </p>
      <dl className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div>
          <dt className="sr-only">Документы</dt>
          <dd>
            {documents} {pluralize(documents, ['документ', 'документа', 'документов'])}
          </dd>
        </div>
        <div>
          <dt className="sr-only">Базовые источники</dt>
          <dd>
            {sources} {pluralize(sources, ['источник', 'источника', 'источников'])}
          </dd>
        </div>
        <ArrowRight
          aria-hidden
          className="ml-auto size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
        />
      </dl>
      <div className="absolute right-3 top-3 z-10 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100 has-[[data-state=open]]:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
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
    </article>
  );
}
