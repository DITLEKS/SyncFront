import { AttentionDocuments } from './AttentionDocuments';
import { DashboardMetrics } from './DashboardMetrics';
import { QuickActions } from './QuickActions';
import { RecentDocuments } from './RecentDocuments';

/** Блоки грузятся независимо: ошибка одного не скрывает остальные. */
export function WorkspaceDashboard() {
  return (
    <div className="space-y-8">
      <DashboardMetrics />
      <AttentionDocuments />
      <RecentDocuments />
      <QuickActions />
    </div>
  );
}
