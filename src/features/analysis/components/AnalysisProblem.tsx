import { AlertTriangle } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isAnalysisProblem } from '@/domain/analysis/analysisState';
import type { DocumentStatus } from '@/domain/document/status';

import { useAnalysisState } from '../hooks/useAnalysis';

interface AnalysisProblemProps {
  projectId: string;
  document: {
    id: string;
    status: DocumentStatus;
    current_analysis_job_id?: string | null;
    analysis?: Parameters<typeof useAnalysisState>[1]['analysis'];
  };
}

/** Значок у черновика, если последний анализ упал или был отменён; причина — в подсказке. */
export function AnalysisProblem({ projectId, document }: AnalysisProblemProps) {
  const state = useAnalysisState(projectId, document);
  if (!state || !isAnalysisProblem(state)) return null;
  const title = state.phase === 'cancelled' ? 'Анализ отменён' : 'Анализ не удался';
  const message = `${title}: ${state.errorMessage ?? state.errorCode ?? 'причина неизвестна'}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex text-amber-600" aria-label={message}>
          <AlertTriangle className="size-4" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{message}</TooltipContent>
    </Tooltip>
  );
}
