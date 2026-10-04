import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { RealtimeProvider } from '@/features/sse';
import { safeStorage } from '@/lib/storage';

import { Sidebar } from './Sidebar';

const SIDEBAR_STORAGE_KEY = 'syncscribe.sidebar.collapsed';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => safeStorage.get(SIDEBAR_STORAGE_KEY) === '1');

  const toggle = useCallback(() => {
    setCollapsed((value) => {
      safeStorage.set(SIDEBAR_STORAGE_KEY, value ? '0' : '1');
      return !value;
    });
  }, []);

  return (
    <RealtimeProvider>
      <div className="flex min-h-screen">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </RealtimeProvider>
  );
}
