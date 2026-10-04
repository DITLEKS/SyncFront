import {
  FileText,
  FolderKanban,
  LayoutDashboard,
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BrandMark } from '@/features/auth';
import { cn } from '@/lib/cn';

import { AccountMenu } from './AccountMenu';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Рабочее пространство', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Проекты', icon: FolderKanban },
  { to: '/documents', label: 'Мои документы', icon: FileText },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r bg-card transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-64',
      )}
      aria-label="Основная навигация"
    >
      <div className={cn('flex h-16 items-center gap-3 px-3', collapsed && 'justify-center')}>
        <BrandMark className="size-9 shrink-0" />
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">SyncScribe</p>
            <p className="truncate text-xs text-muted-foreground">Актуальная документация</p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="space-y-1 border-t p-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn('w-full justify-start gap-3', collapsed && 'justify-center px-0')}
              disabled
              aria-label="Настройки"
            >
              <Settings />
              {!collapsed ? <span>Настройки</span> : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Настройки появятся позже</TooltipContent>
        </Tooltip>

        <AccountMenu collapsed={collapsed} />

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className={cn(
            'w-full justify-start gap-3 text-muted-foreground',
            collapsed && 'justify-center',
          )}
          onClick={onToggle}
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          {!collapsed ? <span>Свернуть</span> : null}
        </Button>
      </div>
    </aside>
  );
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
          collapsed && 'justify-center px-0',
        )
      }
      aria-label={collapsed ? item.label : undefined}
    >
      <item.icon className="size-4 shrink-0" aria-hidden />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </NavLink>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
