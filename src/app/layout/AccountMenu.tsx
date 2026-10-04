import { LogOut, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/cn';

const ROLE_LABEL = { admin: 'Администратор', user: 'Пользователь' } as const;

export function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'mt-3 h-auto min-h-12 w-full justify-center gap-3 rounded-xl px-0 py-2',
            !collapsed && 'md:justify-start md:border md:bg-card md:px-2 md:shadow-sm',
          )}
          aria-label="Аккаунт"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white">
            <UserRound className="size-4" />
          </span>
          {!collapsed ? (
            <span className="hidden min-w-0 text-left md:block">
              <span className="block truncate text-sm font-semibold">
                {user ? ROLE_LABEL[user.role] : 'Аккаунт'}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user?.email}</p>
          <p className="text-xs text-muted-foreground">{user ? ROLE_LABEL[user.role] : ''}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleLogout()}>
          <LogOut />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
