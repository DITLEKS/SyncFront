import { useParams } from 'react-router-dom';

import { PageHeader } from './PageHeader';
import { UnderConstruction } from './UnderConstruction';

export function DocumentPage() {
  const { documentId } = useParams();
  return (
    <>
      <PageHeader title="Документ" meta={documentId} />
      <UnderConstruction step="Шаги 3–4: страница документа по статусу и редактор правок." />
    </>
  );
}
