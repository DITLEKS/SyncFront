import { useCallback, useEffect, useMemo, useState } from 'react';

import type { EditorAggregateResponse, SuggestionResponse } from '@/api/types';
import { isDocumentStatus, type DocumentStatus } from '@/domain/document/status';
import { buildProjection, type Projection } from '@/domain/editor/projection';
import {
  type DecisionBuffer,
  effectiveStatus,
  planSave,
  reviewProgress,
} from '@/domain/editor/review';
import type { Decision, SuggestionStatus } from '@/domain/editor/suggestion';
import { getErrorMessage } from '@/lib/errors';

import { isReviewConflict, useSaveReview } from '../hooks/useEditor';

import { reviewScope, useReviewBuffer } from './reviewBuffer';

export type ViewMode = 'original' | 'suggestions' | 'clean';

/** Начальный режим подсказывает сервер полем view_mode. */
export function initialViewMode(viewMode: string): ViewMode {
  if (viewMode === 'suggested') return 'suggestions';
  if (viewMode === 'clean') return 'clean';
  return 'original';
}

const NO_DECISIONS: DecisionBuffer = {};

export type SaveOutcome = 'saved' | 'conflict' | 'failed';

/**
 * Состояние экрана редактора: данные сервера + буфер решений + проекция текста.
 * Компоненты получают готовые значения и команды, без знания о контракте API.
 */
export function useEditorModel(
  projectId: string,
  editor: EditorAggregateResponse,
  refetch: () => Promise<unknown>,
) {
  const { document: meta, suggestions, counters, permissions } = editor;
  const status: DocumentStatus = isDocumentStatus(meta.status) ? meta.status : 'draft';
  const content = editor.content ?? { plain_text: '', sections: [] };

  const scope = reviewScope(meta.id, meta.current_analysis_job_id);
  const bind = useReviewBuffer((s) => s.bind);
  const boundScope = useReviewBuffer((s) => s.scope);
  const storedDecisions = useReviewBuffer((s) => s.decisions);
  const decide = useReviewBuffer((s) => s.decide);
  const undo = useReviewBuffer((s) => s.undo);
  const forget = useReviewBuffer((s) => s.forget);
  const clear = useReviewBuffer((s) => s.clear);
  useEffect(() => bind(scope), [bind, scope]);
  // До bind() в буфере могут лежать решения другого документа: не показываем их ни на один кадр.
  const decisions = boundScope === scope ? storedDecisions : NO_DECISIONS;

  const plan = useMemo(
    () => planSave(suggestions, decisions, counters.pending),
    [suggestions, decisions, counters.pending],
  );
  // Правка решена в другой сессии или исчезла с новым анализом: решение из буфера уже не применить.
  useEffect(() => {
    if (plan.stale.length > 0) forget(plan.stale);
  }, [plan.stale, forget]);

  const statusOf = useCallback(
    (s: Pick<SuggestionResponse, 'id' | 'status'>): SuggestionStatus =>
      effectiveStatus(s, decisions),
    [decisions],
  );

  const projections = useMemo<Record<'suggestions' | 'clean', Projection>>(() => {
    const base = {
      text: content.plain_text,
      sections: content.sections,
      format: meta.format,
      suggestions,
      statusOf,
    };
    return {
      suggestions: buildProjection({ ...base, addPlacement: 'section' }),
      clean: buildProjection({ ...base, addPlacement: 'end' }),
    };
  }, [content.plain_text, content.sections, meta.format, suggestions, statusOf]);

  const progress = useMemo(
    () => reviewProgress(counters, suggestions, decisions),
    [counters, suggestions, decisions],
  );

  const unsavedCount = plan.decisions.length;
  // Все правки уже решены на сервере, но ревью не завершено (например, другой сессией): даём сохранить.
  const canSave =
    permissions.can_review && (unsavedCount > 0 || (counters.pending === 0 && counters.total > 0));

  const save = useSaveReview(projectId, meta.id);
  const [conflict, setConflict] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveDecisions = useCallback(async (): Promise<SaveOutcome> => {
    setSaveError(null);
    try {
      await save.mutateAsync({
        review_version: meta.review_version,
        decisions: plan.decisions,
        finalize: plan.finalize,
      });
      clear();
      setConflict(null);
      return 'saved';
    } catch (error) {
      if (isReviewConflict(error)) {
        setConflict(getErrorMessage(error));
        await refetch();
        return 'conflict';
      }
      setSaveError(getErrorMessage(error));
      return 'failed';
    }
  }, [save, meta.review_version, plan, clear, refetch]);

  const decideSuggestion = useCallback(
    (id: string, decision: Decision) => {
      if (permissions.can_review) decide(id, decision);
    },
    [decide, permissions.can_review],
  );

  return {
    meta,
    status,
    content,
    suggestions,
    counters,
    permissions,
    projections,
    progress,
    statusOf,
    decisions,
    unsavedCount,
    canSave,
    saving: save.isPending,
    conflict,
    dismissConflict: () => setConflict(null),
    saveError,
    saveDecisions,
    decideSuggestion,
    undoBuffered: undo,
    clearBuffer: clear,
  };
}

export type EditorModel = ReturnType<typeof useEditorModel>;
