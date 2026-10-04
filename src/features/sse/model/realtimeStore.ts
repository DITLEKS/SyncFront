import { create } from 'zustand';

import type { RealtimeState } from './connection';

interface RealtimeStore {
  state: RealtimeState;
  setState: (state: RealtimeState) => void;
}

/** Состояние SSE-соединения: от него зависит, нужен ли запасной опрос сервера. */
export const useRealtimeStore = create<RealtimeStore>((set) => ({
  state: 'stopped',
  setState: (state) => set({ state }),
}));

export function useRealtimeConnected(): boolean {
  return useRealtimeStore((store) => store.state === 'open');
}

/** Интервал запасного опроса, пока SSE не подключено. */
export const REALTIME_FALLBACK_POLL_MS = 5000;
