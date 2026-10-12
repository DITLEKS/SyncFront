import {
  ArrowLeft,
  Check,
  CheckCircle2,
  FileCheck,
  FileText,
  Info,
  MoreHorizontal,
  RefreshCw,
  Save,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

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

const MODE_OPTIONS: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
  { value: 'original', label: 'Оригинал', icon: <FileText aria-hidden /> },
  { value: 'suggestions', label: 'Правки', icon: <Sparkles aria-hidden /> },
  { value: 'clean', label: 'Чистовик', icon: <FileCheck aria-hidden /> },
];

/** Та же точка, что и lg: у сетки редактора — с неё карточка «парит» над текстом у правки. */
const DESKTOP_QUERY = '(min-width: 1024px)';
/** Ширина парящей карточки по макету (34rem); на узкой статье ужимается до её правого края. */
const CARD_WIDTH = 544;
/** Зазор между блоком правки и карточкой. */
const CARD_GAP = 8;

interface FloatingBox {
  top: number;
  left: number;
  width: number;
}

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
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const textRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [floating, setFloating] = useState<FloatingBox | null>(null);

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

  // Отмена решения — из карточки или кнопкой на блоке в тексте. Несохранённое снимается локально,
  // сохранённое — запросом на возврат в pending.
  const undo = useCallback(
    (id: string) => {
      if (model.decisions[id]) {
        model.undoBuffered(id);
        return;
      }
      resetDecisions.mutate([id], { onError: (error) => toast.error(getErrorMessage(error)) });
    },
    [model.decisions, model.undoBuffered, resetDecisions],
  );

  // Выбранная правка исчезла (новый анализ): закрываем карточку.
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  // На десктопе карточка «парит» над текстом рядом с выбранным блоком, не сдвигая ни текст,
  // ни панель. На узком экране, в «Оригинале» и если фрагмент не найден — остаётся в правой панели.
  const canFloat = desktop && selected !== null && mode !== 'original';

  // Считаем позицию относительно обёртки статьи. По умолчанию карточка под блоком; если снизу
  // она вышла бы за край статьи (и растянула страницу) — над блоком. Высота карточки
  // известна только после её отрисовки, поэтому замер повторяется, когда она появилась.
  const measure = useCallback(() => {
    const wrapper = textRef.current;
    if (!wrapper || !selectedId) return;
    const target = Array.from(wrapper.querySelectorAll<HTMLElement>('[data-suggestion-id]')).find(
      (element) => element.dataset.suggestionId === selectedId,
    );
    if (!target) {
      setFloating(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    const base = wrapper.getBoundingClientRect();
    const cardHeight = cardRef.current?.offsetHeight ?? 0;
    const left = Math.round(Math.max(0, rect.left - base.left));
    const width = Math.round(Math.min(CARD_WIDTH, base.width - left));
    const below = rect.bottom - base.top + CARD_GAP;
    const above = rect.top - base.top - CARD_GAP - cardHeight;
    const fitsBelow = below + cardHeight <= base.height;
    const top = Math.round(fitsBelow || above < 0 ? below : above);
    setFloating((prev) =>
      prev && prev.top === top && prev.left === left && prev.width === width
        ? prev
        : { top, left, width },
    );
  }, [selectedId]);

  useLayoutEffect(() => {
    if (!canFloat) {
      setFloating(null);
      return undefined;
    }
    measure();
    const wrapper = textRef.current;
    if (typeof ResizeObserver === 'undefined' || !wrapper) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [canFloat, measure, projection]);

  const popover = canFloat && floating !== null;

  // Карточка появилась или сменила высоту — перепроверяем, помещается ли она снизу, до отрисовки кадра.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!popover || !card) return undefined;
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [popover, measure]);

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

  const allProcessed = progress.total > 0 && progress.pending === 0;
  const completed = status === 'ready' && model.unsavedCount === 0;
  const liveStatus = liveStatusText({
    saving: model.saving,
    conflict: Boolean(model.conflict),
    error: Boolean(model.saveError),
    unsaved: model.unsavedCount,
  });

  const details = selected ? (
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
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 pb-4 pt-2 backdrop-blur-sm md:-mx-8 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="icon" variant="ghost" onClick={goBack} aria-label="Назад">
            <ArrowLeft aria-hidden />
          </Button>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="truncate text-lg font-semibold tracking-tight">{meta.title}</h1>
              <DocumentStatusBadge status={status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
                {progress.pending} на рассмотрении
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
                {progress.accepted} принято
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

      {/* Озвучка состояния ревью для скринридеров; тексты не повторяют видимые баннеры. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveStatus}
      </div>

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
          <div ref={textRef} className="relative">
            <article className="rounded-lg border bg-card px-6 py-5 shadow-sm sm:px-10 sm:py-8">
              {model.content.plain_text ? (
                <DocumentText
                  mode={mode}
                  originalText={model.content.plain_text}
                  segments={projection.segments}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onUndo={undo}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Документ не содержит текста.</p>
              )}
            </article>
            {popover ? (
              // z-[5] — ниже sticky-шапки (z-10): при прокрутке карточка уходит под неё.
              <div
                ref={cardRef}
                className="absolute z-[5]"
                style={{ top: floating.top, left: floating.left, width: floating.width }}
              >
                {details}
              </div>
            ) : null}
          </div>
        </section>

        <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
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
                {popover ? null : details}
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

interface LiveStatusInput {
  saving: boolean;
  conflict: boolean;
  error: boolean;
  unsaved: number;
}

/** Короткое сообщение для aria-live: одно состояние за раз, без дублирования баннеров. */
function liveStatusText({ saving, conflict, error, unsaved }: LiveStatusInput): string {
  if (saving) return 'Идёт сохранение решений';
  if (conflict) return 'Загружена актуальная версия документа, буфер решений сохранён';
  if (error) return 'Сохранение завершилось ошибкой';
  if (unsaved > 0) return `Несохранённых решений: ${unsaved}`;
  return '';
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
