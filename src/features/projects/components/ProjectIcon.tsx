import {
  BookOpen,
  Boxes,
  Cloud,
  Cpu,
  Database,
  FileCode,
  FolderKanban,
  Globe,
  type LucideIcon,
  Rocket,
  Server,
  Shield,
  Workflow,
} from 'lucide-react';

import {
  type ProjectIconName,
  projectColor,
  resolveProjectIcon,
} from '@/domain/project/appearance';
import { cn } from '@/lib/cn';

const ICONS: Record<ProjectIconName, LucideIcon> = {
  'folder-kanban': FolderKanban,
  'book-open': BookOpen,
  'file-code': FileCode,
  server: Server,
  shield: Shield,
  rocket: Rocket,
  boxes: Boxes,
  cloud: Cloud,
  database: Database,
  workflow: Workflow,
  globe: Globe,
  cpu: Cpu,
};

interface ProjectIconProps {
  project: { id: string; color?: string | null; icon?: string | null };
  className?: string;
}

export function ProjectIcon({ project, className }: ProjectIconProps) {
  const color = projectColor(project);
  const icon = resolveProjectIcon(project.icon);
  const Icon = icon.kind === 'lucide' ? ICONS[icon.name] : FolderKanban;
  return (
    <span
      aria-hidden
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', className)}
      style={{ backgroundColor: `${color}1A`, color }}
    >
      {icon.kind === 'emoji' ? (
        <span className="text-lg leading-none">{icon.value}</span>
      ) : (
        <Icon className="size-5" />
      )}
    </span>
  );
}
