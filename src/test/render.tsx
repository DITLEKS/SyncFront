import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';

import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth';
import { CapabilitiesProvider } from '@/features/system';

interface RenderAppOptions extends Omit<RenderOptions, 'wrapper'> {
  routes: RouteObject[];
  initialEntries?: string[];
}

/** Рендер с реальными провайдерами и memory-роутером; MSW подменяет сеть. */
export function renderWithApp({ routes, initialEntries = ['/'], ...options }: RenderAppOptions) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CapabilitiesProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster />
          </TooltipProvider>
        </CapabilitiesProvider>
      </AuthProvider>
    </QueryClientProvider>,
    options,
  );

  return { ...result, router, queryClient };
}
