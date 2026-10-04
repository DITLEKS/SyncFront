import { useParams } from 'react-router-dom';

import { DocumentsPage } from '@/pages/DocumentsPage';
import { ProjectPage } from '@/pages/ProjectPage';
import { ProjectsPage } from '@/pages/ProjectsPage';

// eslint-disable-next-line react-refresh/only-export-components -- тестовая заглушка, HMR не нужен
function DocumentStub() {
  const { documentId } = useParams();
  return <h1>Документ {documentId}</h1>;
}

export const screenRoutes = [
  { path: '/projects', element: <ProjectsPage /> },
  { path: '/projects/:projectId', element: <ProjectPage /> },
  { path: '/projects/:projectId/documents/:documentId', element: <DocumentStub /> },
  { path: '/documents', element: <DocumentsPage /> },
];
