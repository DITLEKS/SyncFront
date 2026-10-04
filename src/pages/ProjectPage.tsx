import { useParams } from 'react-router-dom';

import { PageHeader } from './PageHeader';
import { UnderConstruction } from './UnderConstruction';

export function ProjectPage() {
  const { projectId } = useParams();
  return (
    <>
      <PageHeader title="Проект" meta={projectId} />
      <UnderConstruction step="Шаг 2: базовые источники, документы проекта, загрузка в два этапа и групповой анализ." />
    </>
  );
}
