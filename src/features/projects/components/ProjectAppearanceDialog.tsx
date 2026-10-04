import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ProjectResponse } from '@/api/types';
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
import {
  normalizeProjectColor,
  PROJECT_COLORS,
  projectColor,
  resolveProjectIcon,
} from '@/domain/project/appearance';
import { getErrorMessage } from '@/lib/errors';

import { useUpdateProjectAppearance } from '../hooks/useProjects';
import { type ProjectAppearance, ProjectAppearancePicker } from './ProjectAppearancePicker';
import { ProjectIcon } from './ProjectIcon';

type AppearanceProject = Pick<ProjectResponse, 'id' | 'name' | 'color' | 'icon'>;

interface ProjectAppearanceDialogProps {
  project: AppearanceProject | null;
  onOpenChange: (open: boolean) => void;
}

/** Текущее оформление в терминах пикера; emoji и незнакомые иконки показываются как «По умолчанию». */
function initialAppearance(project: AppearanceProject): ProjectAppearance {
  const shown = projectColor(project).slice(1);
  const icon = resolveProjectIcon(project.icon);
  return {
    color: normalizeProjectColor(shown) ?? PROJECT_COLORS[0],
    icon: icon.kind === 'lucide' ? icon.name : null,
  };
}

export function ProjectAppearanceDialog({ project, onOpenChange }: ProjectAppearanceDialogProps) {
  const update = useUpdateProjectAppearance();
  const [value, setValue] = useState<ProjectAppearance>({ color: PROJECT_COLORS[0], icon: null });
  const [initial, setInitial] = useState<ProjectAppearance>(value);
  // Форма заполняется один раз на открытие: страница проекта опрашивает сервер,
  // и новый объект проекта не должен сбрасывать выбор пользователя.
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const projectId = project?.id ?? null;
  if (project && openedFor !== project.id) {
    const start = initialAppearance(project);
    setOpenedFor(project.id);
    setValue(start);
    setInitial(start);
  } else if (!projectId && openedFor !== null) {
    setOpenedFor(null);
  }

  const resetMutation = update.reset;
  useEffect(() => {
    if (openedFor) resetMutation();
  }, [openedFor, resetMutation]);

  const unchanged = value.color === initial.color && value.icon === initial.icon;

  const save = async () => {
    if (!project || !value.color) return;
    try {
      await update.mutateAsync({ projectId: project.id, color: value.color, icon: value.icon });
      toast.success('Оформление сохранено');
      onOpenChange(false);
    } catch {
      // ошибка показана в окне, оно остаётся открытым
    }
  };

  return (
    <Dialog
      open={project !== null}
      onOpenChange={(open) => !update.isPending && onOpenChange(open)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Оформление проекта</DialogTitle>
          <DialogDescription>
            Цвет и иконка помогают быстрее находить проект в списке.
          </DialogDescription>
        </DialogHeader>
        {project ? (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <ProjectIcon project={{ id: project.id, color: value.color, icon: value.icon }} />
            <span className="min-w-0 truncate font-medium">{project.name}</span>
          </div>
        ) : null}
        <ProjectAppearancePicker
          value={value}
          onChange={setValue}
          previewColor={project ? projectColor(project) : `#${PROJECT_COLORS[0]}`}
          disabled={update.isPending}
        />
        {update.error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{getErrorMessage(update.error)}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={update.isPending}
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            loading={update.isPending}
            disabled={unchanged}
            onClick={() => void save()}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
