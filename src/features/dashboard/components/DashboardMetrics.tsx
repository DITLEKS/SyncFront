import { CheckCircle2, FileText, Hourglass, type LucideIcon } from 'lucide-react';

import type { DashboardResponse } from '@/api/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/state';
import { relevanceLabel, trendDirection, type TrendPoint } from '@/domain/dashboard/trend';
import { getErrorMessage } from '@/lib/errors';

import { useDashboardSummary } from '../hooks/useDashboard';

import { Sparkline } from './Sparkline';

const TREND_TEXT = { up: 'растёт', down: 'снижается', flat: 'без изменений' } as const;

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: TrendPoint[];
}

function MetricCard({ icon: Icon, label, value, trend }: MetricCardProps) {
  const values = trend.map((point) => point.value);
  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        {label}
      </div>
      <div className="flex items-end justify-between gap-4">
        <p className="text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        <div className="w-28 shrink-0">
          <Sparkline values={values} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        За неделю: {TREND_TEXT[trendDirection(values)]}
      </p>
    </li>
  );
}

function metrics(summary: DashboardResponse): MetricCardProps[] {
  return [
    {
      icon: FileText,
      label: 'Всего документов',
      value: String(summary.total_documents),
      trend: summary.total_trend,
    },
    {
      icon: Hourglass,
      label: 'Ожидают утверждения',
      value: String(summary.awaiting_approval_count),
      trend: summary.awaiting_trend,
    },
    {
      icon: CheckCircle2,
      label: 'Актуальность базы',
      value: relevanceLabel(summary.relevance_percent, summary.total_documents),
      trend: summary.relevance_trend,
    },
  ];
}

export function DashboardMetrics() {
  const summary = useDashboardSummary();

  if (summary.isPending) {
    return (
      <ul className="grid gap-4 md:grid-cols-3" aria-label="Загрузка показателей">
        {[0, 1, 2].map((key) => (
          <li key={key}>
            <Skeleton className="h-[134px] rounded-lg" />
          </li>
        ))}
      </ul>
    );
  }
  if (summary.isError) {
    return (
      <ErrorState message={getErrorMessage(summary.error)} onRetry={() => summary.refetch()} />
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-3" aria-label="Показатели">
      {metrics(summary.data).map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </ul>
  );
}
