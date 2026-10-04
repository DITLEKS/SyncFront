import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';

import { queryKeys } from '@/api/queryKeys';
import { getCapabilities } from '@/api/resources/system';
import type { CapabilitiesResponse } from '@/api/types';

interface CapabilitiesContextValue {
  capabilities: CapabilitiesResponse | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

const CapabilitiesContext = createContext<CapabilitiesContextValue | null>(null);

/**
 * Читает /system/capabilities один раз на сессию (без авторизации) и кеширует навсегда.
 * Лимит и форматы загрузки берутся отсюда, а не из констант.
 */
export function CapabilitiesProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: queryKeys.system.capabilities,
    queryFn: getCapabilities,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return (
    <CapabilitiesContext.Provider
      value={{
        capabilities: query.data,
        isLoading: query.isPending,
        error: query.error,
        refetch: () => void query.refetch(),
      }}
    >
      {children}
    </CapabilitiesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- хук и провайдер живут вместе
export function useCapabilities(): CapabilitiesContextValue {
  const context = useContext(CapabilitiesContext);
  if (!context) throw new Error('useCapabilities вызван вне CapabilitiesProvider');
  return context;
}
