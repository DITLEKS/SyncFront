import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { GuestOnly, RequireAuth } from '@/features/auth';

import { AppShell } from './layout/AppShell';
import { PageFallback } from './layout/PageFallback';

// Страницы подгружаются по требованию: каждый маршрут — отдельный chunk,
// редактор (DocumentPage + features/editor) не попадает в начальный бандл.
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const WorkspacePage = lazy(() =>
  import('@/pages/WorkspacePage').then((m) => ({ default: m.WorkspacePage })),
);
const ProjectsPage = lazy(() =>
  import('@/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
);
const ProjectPage = lazy(() =>
  import('@/pages/ProjectPage').then((m) => ({ default: m.ProjectPage })),
);
const DocumentPage = lazy(() =>
  import('@/pages/DocumentPage').then((m) => ({ default: m.DocumentPage })),
);
const DocumentsPage = lazy(() =>
  import('@/pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const RouteErrorPage = lazy(() =>
  import('@/pages/RouteErrorPage').then((m) => ({ default: m.RouteErrorPage })),
);

function withFallback(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export const routes = {
  login: '/login',
  register: '/register',
  workspace: '/',
  projects: '/projects',
  project: (projectId: string) => `/projects/${projectId}`,
  documents: '/documents',
  document: (projectId: string, documentId: string) =>
    `/projects/${projectId}/documents/${documentId}`,
} as const;

export const router = createBrowserRouter([
  {
    errorElement: withFallback(<RouteErrorPage />),
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: routes.login, element: withFallback(<LoginPage />) },
          { path: routes.register, element: withFallback(<RegisterPage />) },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: withFallback(<WorkspacePage />) },
              { path: 'projects', element: withFallback(<ProjectsPage />) },
              { path: 'projects/:projectId', element: withFallback(<ProjectPage />) },
              {
                path: 'projects/:projectId/documents/:documentId',
                element: withFallback(<DocumentPage />),
              },
              { path: 'documents', element: withFallback(<DocumentsPage />) },
            ],
          },
        ],
      },
      { path: '*', element: withFallback(<NotFoundPage />) },
    ],
  },
]);
