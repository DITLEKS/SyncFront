import { PageHeader } from './PageHeader';
import { UnderConstruction } from './UnderConstruction';

export function WorkspacePage() {
  return (
    <>
      <PageHeader title="Рабочее пространство" />
      <UnderConstruction step="Шаг 3: дашборд, «Требуют внимания», «Недавние», быстрые действия и SSE." />
    </>
  );
}
