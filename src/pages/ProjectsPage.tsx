import { ProjectsView } from '@/features/projects';
import { pluralize } from '@/lib/format';

import { PageHeader } from './PageHeader';

export function ProjectsPage() {
  return (
    <ProjectsView
      renderHeader={({ total, createButton }) => (
        <PageHeader
          title="Проекты"
          meta={
            total === null
              ? undefined
              : `${total} ${pluralize(total, ['проект', 'проекта', 'проектов'])}`
          }
          actions={createButton}
        />
      )}
    />
  );
}
