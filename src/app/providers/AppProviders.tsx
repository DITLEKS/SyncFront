import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth';
import { CapabilitiesProvider } from '@/features/system';

import { QueryProvider } from './QueryProvider';

/**
 * Порядок важен: Query → Auth (использует queryClient) → Capabilities.
 * SSE-провайдер появится на следующем шаге внутри защищённого layout.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <CapabilitiesProvider>
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        </CapabilitiesProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
