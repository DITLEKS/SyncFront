import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authSession } from '@/api/authSession';
import { queryKeys } from '@/api/queryKeys';
import * as authApi from '@/api/resources/auth';
import type { UserLoginRequest, UserRegisterRequest, UserResponse, UserRole } from '@/api/types';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export interface AuthUser extends Omit<UserResponse, 'role'> {
  role: UserRole;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (credentials: UserLoginRequest) => Promise<void>;
  /** Регистрация не выдаёт токены — сразу выполняется вход теми же данными. */
  register: (credentials: UserRegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionState = 'bootstrapping' | 'anonymous' | 'active';

function toAuthUser(user: UserResponse): AuthUser {
  return { ...user, role: user.role === 'admin' ? 'admin' : 'user' };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [sessionState, setSessionState] = useState<SessionState>(() =>
    authSession.hasRefreshToken() ? 'bootstrapping' : 'anonymous',
  );

  // При старте с сохранённым refresh-токеном восстанавливаем сессию одним refresh.
  useEffect(() => {
    if (sessionState !== 'bootstrapping') return;
    let cancelled = false;
    authSession
      .refresh()
      .then(() => {
        if (!cancelled) setSessionState('active');
      })
      .catch(() => {
        if (!cancelled) setSessionState('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, [sessionState]);

  // Сессию может очистить middleware клиента (неудачный refresh на 401).
  useEffect(
    () =>
      authSession.subscribe((event) => {
        if (event === 'cleared') {
          setSessionState('anonymous');
          queryClient.clear();
        }
      }),
    [queryClient],
  );

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.getMe,
    enabled: sessionState === 'active',
    staleTime: Infinity,
    retry: false,
  });

  const login = useCallback(async (credentials: UserLoginRequest) => {
    const tokens = await authApi.login(credentials);
    authSession.setTokens(tokens);
    setSessionState('active');
  }, []);

  const register = useCallback(
    async (credentials: UserRegisterRequest) => {
      await authApi.register(credentials);
      await login(credentials);
    },
    [login],
  );

  const logout = useCallback(async () => {
    const refreshToken = authSession.getRefreshToken();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Сервер мог уже отозвать токен; локальную сессию очищаем в любом случае.
    } finally {
      authSession.clear();
    }
  }, []);

  const status: AuthStatus = useMemo(() => {
    if (sessionState === 'anonymous') return 'anonymous';
    if (sessionState === 'bootstrapping' || meQuery.isPending) return 'loading';
    if (meQuery.isError) return 'anonymous';
    return 'authenticated';
  }, [sessionState, meQuery.isPending, meQuery.isError]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: status === 'authenticated' && meQuery.data ? toAuthUser(meQuery.data) : null,
      login,
      register,
      logout,
    }),
    [status, meQuery.data, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- хук и провайдер живут вместе
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth вызван вне AuthProvider');
  return context;
}
