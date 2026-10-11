import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  FolderKanban,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Sparkles,
} from 'lucide-react';
import { NavLink, useMatch } from 'react-router-dom';

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
  { to: '/documents', label: 'Мои документы', icon: FolderOpen },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'sidebar-atmosphere sticky top-0 z-20 flex h-dvh shrink-0 flex-col overflow-visible border-r bg-card/95 shadow-sm backdrop-blur transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
        collapsed ? 'w-20' : 'w-20 md:w-64',
      )}
      aria-label="Основная навигация"
    >
      <Button
        variant="outline"
        size="icon"
        className="absolute -right-3 top-6 z-30 hidden size-6 rounded-full bg-card p-1 text-muted-foreground shadow-sm hover:bg-card hover:text-foreground md:inline-flex"
        onClick={onToggle}
        aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        aria-expanded={!collapsed}
        aria-controls="sidebar-navigation"
      >
        {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
      </Button>

      <div
        className={cn(
          'relative z-10 flex h-16 shrink-0 items-center justify-center gap-3 border-b border-border/70 px-4',
          !collapsed && 'md:justify-start',
        )}
      >
        <BrandMark className="size-8 shrink-0 shadow-md shadow-indigo-300/30" />
        {!collapsed ? (
          <div className="hidden min-w-0 items-center gap-1.5 md:flex">
            <p className="truncate text-base font-bold tracking-tight">SyncScribe</p>
            <Sparkles className="size-3.5 shrink-0 text-indigo-400" aria-hidden />
          </div>
        ) : null}
      </div>

      <div className="relative z-10 shrink-0 px-6 pb-2 pt-6">
        <span
          className={cn(
            'block h-4 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground/75',
            collapsed ? 'invisible' : 'invisible md:visible',
          )}
        >
          Навигация
        </span>
      </div>

      <nav
        id="sidebar-navigation"
        className="relative z-10 min-h-0 flex-1 space-y-1 overflow-y-auto px-3"
      >
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="relative z-10 shrink-0 space-y-1 border-t border-border/70 bg-card/55 p-3 backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'h-12 w-full justify-center gap-3 rounded-xl px-0 text-muted-foreground [&_svg]:size-5',
                !collapsed && 'md:h-10 md:justify-start md:px-3',
              )}
              disabled
              aria-label="Настройки"
            >
              <Settings />
              {!collapsed ? <span className="hidden md:inline">Настройки</span> : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Настройки появятся позже</TooltipContent>
        </Tooltip>

        <AccountMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const isActive = useMatch({ path: item.to, end: item.end ?? false }) !== null;
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={cn(
        'group mx-auto flex h-12 w-12 items-center justify-center gap-3 rounded-xl text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-200 motion-reduce:transition-none',
        'hover:bg-white/70 hover:text-foreground active:scale-[0.98]',
        isActive
          ? 'bg-indigo-50/90 font-semibold text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-500/10'
          : 'text-muted-foreground',
        !collapsed && 'md:h-10 md:w-full md:justify-start md:px-3',
      )}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <item.icon
        className={cn(
          'size-5 shrink-0 transition-colors',
          isActive ? 'text-indigo-600' : 'group-hover:text-foreground',
        )}
        strokeWidth={isActive ? 2.5 : 2}
        aria-hidden
      />
      {!collapsed ? <span className="hidden truncate md:inline">{item.label}</span> : null}
      {isActive && !collapsed ? (
        <span
          className="ml-auto hidden size-1.5 shrink-0 rounded-full bg-indigo-600 shadow-[0_0_0_3px_rgba(99,102,241,0.10)] md:block"
          aria-hidden
        />
      ) : null}
    </NavLink>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
