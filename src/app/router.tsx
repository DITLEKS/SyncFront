import { createBrowserRouter } from 'react-router-dom';

import { GuestOnly, RequireAuth } from '@/features/auth';
import { DocumentPage } from '@/pages/DocumentPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProjectPage } from '@/pages/ProjectPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { WorkspacePage } from '@/pages/WorkspacePage';

import { AppShell } from './layout/AppShell';

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
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: routes.login, element: <LoginPage /> },
          { path: routes.register, element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <WorkspacePage /> },
              { path: 'projects', element: <ProjectsPage /> },
              { path: 'projects/:projectId', element: <ProjectPage /> },
              { path: 'projects/:projectId/documents/:documentId', element: <DocumentPage /> },
              { path: 'documents', element: <DocumentsPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
