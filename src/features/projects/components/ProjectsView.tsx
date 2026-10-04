import { FolderPlus, Plus } from 'lucide-react';
import { useState } from 'react';

import type { ProjectResponse } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state';
import { getErrorMessage } from '@/lib/errors';

import { useProjectsInfinite } from '../hooks/useProjects';

import { CreateProjectDialog } from './CreateProjectDialog';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { ProjectAppearanceDialog } from './ProjectAppearanceDialog';
import { ProjectCard } from './ProjectCard';
import { RenameProjectDialog } from './RenameProjectDialog';

interface ProjectsViewProps {
  /** Шапка страницы принимает счётчик и кнопку создания. */
  renderHeader: (props: { total: number | null; createButton: React.ReactNode }) => React.ReactNode;
}

export function ProjectsView({ renderHeader }: ProjectsViewProps) {
  const query = useProjectsInfinite();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<ProjectResponse | null>(null);
  const [deleting, setDeleting] = useState<ProjectResponse | null>(null);
  const [styling, setStyling] = useState<ProjectResponse | null>(null);

  const projects = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? null;

  const createButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden />
      Новый проект
    </Button>
  );

  return (
    <>
      {renderHeader({ total, createButton })}

      {query.isPending ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Загрузка проектов"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="Пока нет проектов"
          description="Создайте первый проект, чтобы собрать в нём документы и источники истины."
          action={createButton}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onRename={setRenaming}
                onEditAppearance={setStyling}
                onDelete={setDeleting}
              />
            ))}
          </div>
          {query.hasNextPage ? (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                loading={query.isFetchingNextPage}
                onClick={() => void query.fetchNextPage()}
              >
                Показать ещё
              </Button>
            </div>
          ) : null}
        </>
      )}

      <CreateProjectDialog open={creating} onOpenChange={setCreating} />
      <RenameProjectDialog project={renaming} onOpenChange={(open) => !open && setRenaming(null)} />
      <ProjectAppearanceDialog
        project={styling}
        onOpenChange={(open) => !open && setStyling(null)}
      />
      <DeleteProjectDialog project={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
    </>
  );
}
