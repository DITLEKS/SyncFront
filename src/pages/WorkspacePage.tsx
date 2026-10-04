import { WorkspaceDashboard } from '@/features/dashboard';

import { PageHeader } from './PageHeader';

export function WorkspacePage() {
  return (
    <>
      <PageHeader title="Рабочее пространство" />
      <WorkspaceDashboard />
    </>
  );
}
