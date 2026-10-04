import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { authSession } from '@/api/authSession';
import { API_PREFIX, apiBaseUrl } from '@/api/config';

import { applyDocumentStatusChanged, resyncAfterReconnect } from '../model/applyDocumentEvent';
import { openRealtimeConnection, type RealtimeState } from '../model/connection';
import { DOCUMENT_STATUS_CHANGED, parseDocumentStatusChanged } from '../model/documentEvents';
import { useRealtimeStore } from '../model/realtimeStore';

export const DOCUMENT_EVENTS_URL = `${apiBaseUrl}${API_PREFIX}/events/documents`;

/**
 * Одно SSE-соединение на приложение, без фильтра document_ids: событий мало,
 * а фильтр пришлось бы менять при каждой навигации. Живёт внутри защищённого layout.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const setState = useRealtimeStore((store) => store.setState);

  useEffect(() => {
    let wasOpen = false;
    const connection = openRealtimeConnection({
      url: DOCUMENT_EVENTS_URL,
      getAccessToken: () => authSession.ensureFreshAccessToken(),
      refreshAccessToken: () => authSession.refresh(),
      onStateChange: (state: RealtimeState) => {
        setState(state);
        if (state !== 'open') return;
        if (wasOpen) void resyncAfterReconnect(queryClient);
        wasOpen = true;
      },
      onMessage: (message) => {
        if (message.event !== DOCUMENT_STATUS_CHANGED) return;
        const event = parseDocumentStatusChanged(message.data);
        if (event) void applyDocumentStatusChanged(queryClient, event);
      },
    });
    return () => {
      connection.close();
      setState('stopped');
    };
  }, [queryClient, setState]);

  return <>{children}</>;
}
