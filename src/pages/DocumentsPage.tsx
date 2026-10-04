import { PageHeader } from './PageHeader';
import { UnderConstruction } from './UnderConstruction';

export function DocumentsPage() {
  return (
    <>
      <PageHeader title="Мои документы" />
      <UnderConstruction step="Шаг 2: таблица документов с поиском, фильтром по статусу и удалением." />
    </>
  );
}
