import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import type { SaveOutcome } from '../model/useEditorModel';
import { EDITOR_TEXTS } from '../model/texts';

interface LeaveGuardProps {
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => Promise<SaveOutcome>;
  onDiscard: () => void;
}

/** Не даёт уйти со страницы с несохранёнными решениями: переход внутри SPA и закрытие вкладки. */
export function LeaveGuard({ dirty, saving, saveError, onSave, onDiscard }: LeaveGuardProps) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  const [conflictOnSave, setConflictOnSave] = useState(false);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event: BeforeUnloadEvent) => {
      // Текст диалога браузер подставляет свой; preventDefault достаточно для современных браузеров.
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (blocker.state !== 'blocked') return null;

  const stay = () => {
    setConflictOnSave(false);
    blocker.reset();
  };
  const saveAndLeave = async () => {
    const outcome = await onSave();
    if (outcome === 'saved') blocker.proceed();
    // При конфликте данные уже перезагружены: пусть пользователь посмотрит, что изменилось.
    else if (outcome === 'conflict') setConflictOnSave(true);
  };
  const error = conflictOnSave ? EDITOR_TEXTS.conflictTitle : saveError;

  return (
    <AlertDialog.Root open onOpenChange={(open) => !open && !saving && stay()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-card p-6 shadow-lg">
          <AlertDialog.Title className="text-lg font-semibold">
            Несохранённые изменения
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-muted-foreground">
            {EDITOR_TEXTS.leaveText}
          </AlertDialog.Description>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={saving}>
                Остаться
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                onDiscard();
                blocker.proceed();
              }}
            >
              Выйти без сохранения
            </Button>
            <Button loading={saving} onClick={() => void saveAndLeave()}>
              Сохранить и выйти
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
