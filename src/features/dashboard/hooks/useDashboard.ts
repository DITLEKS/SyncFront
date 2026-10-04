import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { getAttentionDocuments, getDashboard, getRecentDocuments } from '@/api/resources/dashboard';
import { useRealtimeConnected } from '@/features/sse';

/**
 * С SSE дашборд перезапрашивается по событиям. Без соединения статусы
 * могут поменяться где угодно, поэтому опрашиваем редко, но без условий.
 */
const DASHBOARD_FALLBACK_POLL_MS = 15_000;

function useFallbackInterval(): number | false {
  return useRealtimeConnected() ? false : DASHBOARD_FALLBACK_POLL_MS;
}

export function useDashboardSummary() {
  const refetchInterval = useFallbackInterval();
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: getDashboard,
    refetchInterval,
  });
}

export function useAttentionDocuments() {
  const refetchInterval = useFallbackInterval();
  return useQuery({
    queryKey: queryKeys.dashboard.attention,
    queryFn: getAttentionDocuments,
    refetchInterval,
  });
}

export function useRecentDocuments() {
  const refetchInterval = useFallbackInterval();
  return useQuery({
    queryKey: queryKeys.dashboard.recent,
    queryFn: getRecentDocuments,
    refetchInterval,
  });
}
