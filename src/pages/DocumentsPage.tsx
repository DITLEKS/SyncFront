import { MyDocumentsView } from '@/features/documents';
import { pluralize } from '@/lib/format';

import { PageHeader } from './PageHeader';

export function DocumentsPage() {
  return (
    <MyDocumentsView
      renderHeader={({ total, uploadButton }) => (
        <PageHeader
          title="Мои документы"
          meta={
            total === undefined
              ? undefined
              : `${total} ${pluralize(total, ['документ', 'документа', 'документов'])}`
          }
          actions={uploadButton}
        />
      )}
    />
  );
}
