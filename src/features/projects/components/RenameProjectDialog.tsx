import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/errors';

import { useRenameProject } from '../hooks/useProjects';
import { projectNameSchema } from '../model/schemas';

interface RenameProjectDialogProps {
  project: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}

const schema = z.object({ name: projectNameSchema });

export function RenameProjectDialog({ project, onOpenChange }: RenameProjectDialogProps) {
  const rename = useRenameProject();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: project?.name ?? '' },
  });
  const { reset } = form;
  const resetMutation = rename.reset;

  useEffect(() => {
    if (project) {
      reset({ name: project.name });
      resetMutation();
    }
  }, [project, reset, resetMutation]);

  const name = form.watch('name');
  const unchanged = name.trim() === project?.name;

  const submit = form.handleSubmit(async ({ name: nextName }) => {
    if (!project) return;
    try {
      await rename.mutateAsync({ projectId: project.id, name: nextName });
      toast.success('Проект переименован');
      onOpenChange(false);
    } catch {
      // ошибка показана в форме, окно остаётся открытым
    }
  });

  return (
    <Dialog
      open={project !== null}
      onOpenChange={(open) => !rename.isPending && onOpenChange(open)}
    >
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Переименовать проект</DialogTitle>
            <DialogDescription>
              Новое название увидят все, у кого есть доступ к проекту.
            </DialogDescription>
          </DialogHeader>
          <FormField label="Название проекта" error={form.formState.errors.name?.message}>
            <Input autoFocus maxLength={255} {...form.register('name')} />
          </FormField>
          {rename.error ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{getErrorMessage(rename.error)}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={rename.isPending}
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" loading={rename.isPending} disabled={!name.trim() || unchanged}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
