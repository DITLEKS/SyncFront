import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Info,
  MoreHorizontal,
  RefreshCw,
  Save,
  TriangleAlert,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { EditorAggregateResponse } from '@/api/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StartAnalysisButton } from '@/features/analysis';
import { DocumentStatusBadge } from '@/features/documents';
import { getErrorMessage } from '@/lib/errors';

import { useResetDecisions, useResetReview } from '../hooks/useEditor';
import { EDITOR_TEXTS } from '../model/texts';
import { initialViewMode, useEditorModel, type ViewMode } from '../model/useEditorModel';

import { DocumentText } from './DocumentText';
import { ExportButton } from './ExportButton';
import { LeaveGuard } from './LeaveGuard';
import { SuggestionDetails } from './SuggestionDetails';
import { SuggestionsPanel } from './SuggestionsPanel';

interface EditorScreenProps {
  projectId: string;
  editor: EditorAggregateResponse;
  refetch: () => Promise<unknown>;
}

const MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'original', label: 'Оригинал' },
  { value: 'suggestions', label: 'Правки' },
  { value: 'clean', label: 'Чистовик' },
];

export function EditorScreen({ projectId, editor, refetch }: EditorScreenProps) {
  const model = useEditorModel(projectId, editor, refetch);
  const { meta, status, permissions, progress } = model;
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<ViewMode>(() => initialViewMode(meta.view_mode));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const resetReview = useResetReview(projectId, meta.id);
  const resetDecisions = useResetDecisions(projectId, meta.id);

  const projection = mode === 'clean' ? model.projections.clean : model.projections.suggestions;
  const selected = model.suggestions.find((s) => s.id === selectedId) ?? null;
  const unsavedIds = useMemo(() => new Set(Object.keys(model.decisions)), [model.decisions]);

  const selectFromPanel = useCallback((id: string) => {
    setSelectedId(id);
    // Прокручиваем после отрисовки выделения; в jsdom scrollIntoView нет.
    requestAnimationFrame(() => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>('[data-suggestion-id]'),
      ).find((element) => element.dataset.suggestionId === id);
      target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    });
  }, []);

  // Выбранная правка исчезла (новый анализ): закрываем карточку.
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  const goBack = () => {
    // key 'default' у первой записи истории: страницу открыли по ссылке, назад некуда.
    if (location.key !== 'default') navigate(-1);
    else navigate(`/projects/${projectId}`);
  };

  const save = async () => {
    const outcome = await model.saveDecisions();
    if (outcome === 'saved') toast.success('Изменения сохранены');
    return outcome;
  };

  const undo = (id: string) => {
    if (model.decisions[id]) {
      model.undoBuffered(id);
      return;
    }
    resetDecisions.mutate([id], { onError: (error) => toast.error(getErrorMessage(error)) });
  };

  const allProcessed = progress.total > 0 && progress.pending === 0;
  const completed = status === 'ready' && model.unsavedCount === 0;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="icon" variant="ghost" onClick={goBack} aria-label="Назад">
            <ArrowLeft aria-hidden />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{meta.title}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <DocumentStatusBadge status={status} />
              <span>
                На рассмотрении:{' '}
                <span className="tabular-nums text-foreground">{progress.pending}</span>
              </span>
              <span>
                Принято: <span className="tabular-nums text-foreground">{progress.accepted}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<ViewMode>
            sliding
            ariaLabel="Режим просмотра"
            value={mode}
            onChange={setMode}
            options={MODE_OPTIONS}
          />
          {status === 'ready' ? (
            <StartAnalysisButton
              projectId={projectId}
              document={{ id: meta.id, name: meta.title, status }}
            />
          ) : null}
          <ExportButton
            projectId={projectId}
            documentId={meta.id}
            title={meta.title}
            format={meta.format}
            enabled={permissions.can_export && model.unsavedCount === 0}
          />
          <SaveButton canSave={model.canSave} saving={model.saving} onSave={() => void save()} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Дополнительные действия">
                <MoreHorizontal aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!(permissions.can_review || status === 'ready')}
                onSelect={() => setResetOpen(true)}
              >
                <RefreshCw aria-hidden />
                {EDITOR_TEXTS.resetTitle}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {model.conflict ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <AlertTitle>{EDITOR_TEXTS.conflictTitle}</AlertTitle>
          <AlertDescription>
            {EDITOR_TEXTS.conflictText}
            <span className="mt-1 block text-xs opacity-80">{model.conflict}</span>
          </AlertDescription>
          <Button size="sm" variant="outline" className="mt-2" onClick={model.dismissConflict}>
            Понятно
          </Button>
        </Alert>
      ) : null}
      {model.saveError ? (
        <Alert variant="destructive" role="alert">
          <TriangleAlert aria-hidden />
          <AlertTitle>Не удалось сохранить изменения</AlertTitle>
          <AlertDescription>{model.saveError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Текст документа" className="min-w-0 space-y-3">
          {mode === 'original' ? (
            <Alert>
              <Info aria-hidden />
              <AlertDescription>{EDITOR_TEXTS.originalNotice}</AlertDescription>
            </Alert>
          ) : null}
          <article className="rounded-lg border bg-card px-6 py-5 shadow-sm sm:px-10 sm:py-8">
            {model.content.plain_text ? (
              <DocumentText
                mode={mode}
                originalText={model.content.plain_text}
                segments={projection.segments}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Документ не содержит текста.</p>
            )}
          </article>
        </section>

        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <SuggestionsPanel
            suggestions={model.suggestions}
            statusOf={model.statusOf}
            unsavedIds={unsavedIds}
            located={projection.located}
            progress={progress}
            selectedId={selectedId}
            onSelect={selectFromPanel}
            header={
              <>
                {allProcessed ? (
                  completed ? (
                    <Alert variant="success">
                      <CheckCircle2 aria-hidden />
                      <AlertDescription>{EDITOR_TEXTS.completed}</AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <CheckCircle2 aria-hidden />
                      <AlertDescription className="space-y-2">
                        <p>{EDITOR_TEXTS.allProcessed}</p>
                        <span className="flex flex-wrap gap-2">
                          <SaveButton
                            canSave={model.canSave}
                            saving={model.saving}
                            onSave={() => void save()}
                          />
                          {mode !== 'clean' ? (
                            <Button size="sm" variant="outline" onClick={() => setMode('clean')}>
                              Просмотреть чистовик
                            </Button>
                          ) : null}
                        </span>
                      </AlertDescription>
                    </Alert>
                  )
                ) : null}
                {selected ? (
                  <SuggestionDetails
                    key={selected.id}
                    suggestion={selected}
                    status={model.statusOf(selected)}
                    unsaved={unsavedIds.has(selected.id)}
                    located={projection.located[selected.id]}
                    canReview={permissions.can_review}
                    undoing={resetDecisions.isPending}
                    onDecide={(decision) => {
                      model.decideSuggestion(selected.id, decision);
                      setSelectedId(null);
                    }}
                    onUndo={() => undo(selected.id)}
                    onClose={() => setSelectedId(null)}
                  />
                ) : null}
              </>
            }
          />
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) resetReview.reset();
        }}
        title={EDITOR_TEXTS.resetTitle}
        description={EDITOR_TEXTS.resetText}
        confirmLabel="Сбросить"
        destructive
        loading={resetReview.isPending}
        error={resetReview.error ? getErrorMessage(resetReview.error) : null}
        onConfirm={() =>
          resetReview.mutate(undefined, {
            onSuccess: () => {
              model.clearBuffer();
              setResetOpen(false);
              toast.success('Решения сброшены');
            },
          })
        }
      />

      <LeaveGuard
        dirty={model.unsavedCount > 0}
        saving={model.saving}
        saveError={model.saveError}
        onSave={save}
        onDiscard={model.clearBuffer}
      />
    </div>
  );
}

function SaveButton({
  canSave,
  saving,
  onSave,
}: {
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  if (!canSave && !saving) {
    return (
      <Button size="sm" variant="outline" disabled>
        <Check aria-hidden />
        Сохранено
      </Button>
    );
  }
  return (
    <Button size="sm" loading={saving} onClick={onSave}>
      <Save aria-hidden />
      Сохранить
    </Button>
  );
}
