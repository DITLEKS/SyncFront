import { RouterProvider } from 'react-router-dom';

import { Toaster } from '@/components/ui/toaster';

import { ErrorBoundary } from './ErrorBoundary';
import { AppProviders } from './providers/AppProviders';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
        <Toaster />
      </AppProviders>
    </ErrorBoundary>
  );
}
