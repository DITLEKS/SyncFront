import { ChevronRight, FileUp, Library, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { BulkAnalysisButton } from '@/features/analysis';
import { ProjectDocumentsList, UploadDocumentDialog } from '@/features/documents';
import {
  DeleteProjectDialog,
  ProjectIcon,
  RenameProjectDialog,
  useProjectDetail,
} from '@/features/projects';
import { ProjectSourceEditor } from '@/features/sources';
import { getErrorMessage, isApiError } from '@/lib/errors';
import { formatDate, pluralize } from '@/lib/format';

import { NotFoundPage } from './NotFoundPage';

export function ProjectPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const project = useProjectDetail(projectId);
  const [uploading, setUploading] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (project.isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Загрузка проекта">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (project.isError) {
    if (isApiError(project.error) && project.error.status === 404) return <NotFoundPage />;
    return (
      <ErrorState message={getErrorMessage(project.error)} onRetry={() => void project.refetch()} />
    );
  }

  const data = project.data;
  const documents = data.documents ?? [];
  const sources = data.sources ?? [];
  // Сервер пока отдаёт document_count = 0, поэтому считаем по присланному списку.
  const documentCount = Math.max(data.document_count, documents.length);
  const uploadButton = (
    <Button onClick={() => setUploading(true)}>
      <FileUp aria-hidden />
      Загрузить документ
    </Button>
  );

  return (
    <>
      <nav
        aria-label="Навигационная цепочка"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link to="/projects" className="hover:text-foreground hover:underline">
          Проекты
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <span aria-current="page" className="truncate text-foreground">
          {data.name}
        </span>
      </nav>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <ProjectIcon project={data} className="size-12" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{data.name}</h1>
            {data.description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{data.description}</p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Создан {formatDate(data.created_at)} · {documentCount}{' '}
              {pluralize(documentCount, ['документ', 'документа', 'документов'])}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploadButton}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Действия с проектом">
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil aria-hidden />
                Переименовать
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleting(true)}
              >
                <Trash2 aria-hidden />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <section aria-labelledby="base-sources-title" className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 id="base-sources-title" className="text-lg font-semibold">
              Базовые источники истины
            </h2>
            <p className="text-sm text-muted-foreground">
              Применяются к каждому документу проекта.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-expanded={addingSource}
            onClick={() => setAddingSource((v) => !v)}
          >
            <Plus aria-hidden />
            {addingSource ? 'Скрыть форму' : 'Добавить'}
          </Button>
        </div>
        {sources.length === 0 && !addingSource ? (
          <EmptyState
            icon={Library}
            title="Базовых источников пока нет"
            description="Добавьте файл, ссылку или заметку, на которые ИИ будет опираться при анализе."
            action={
              <Button size="sm" onClick={() => setAddingSource(true)}>
                <Plus aria-hidden />
                Добавить источник
              </Button>
            }
            className="py-8"
          />
        ) : (
          <ProjectSourceEditor
            projectId={projectId}
            target={{ scope: 'project' }}
            items={sources}
            emptyText="Базовых источников пока нет."
            showForm={addingSource}
          />
        )}
      </section>

      <section aria-labelledby="project-documents-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="project-documents-title" className="text-lg font-semibold">
            Документы проекта
          </h2>
          <BulkAnalysisButton projectId={projectId} documents={documents} />
        </div>
        {documents.length === 0 ? (
          <EmptyState
            icon={FileUp}
            title="В проекте пока нет документов"
            description="Загрузите первый документ, чтобы проверить его актуальность."
            action={uploadButton}
          />
        ) : (
          <>
            <ProjectDocumentsList
              projectId={projectId}
              documents={documents}
              baseSources={sources}
            />
            {data.document_count > documents.length ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Показаны первые {documents.length} документов. Остальные доступны в разделе «Мои
                документы».
              </p>
            ) : null}
          </>
        )}
      </section>

      <UploadDocumentDialog open={uploading} onOpenChange={setUploading} projectId={projectId} />
      <RenameProjectDialog project={renaming ? data : null} onOpenChange={setRenaming} />
      <DeleteProjectDialog
        project={deleting ? data : null}
        onOpenChange={setDeleting}
        onDeleted={() => navigate('/projects', { replace: true })}
      />
    </>
  );
}
