import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../AuthProvider';
import { RETURN_TO_PARAM } from '../model/returnTo';
import { FullPageSpinner } from './FullPageSpinner';

/** Защищённая ветка маршрутов: анонимного пользователя ведём на /login с returnTo. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner label="Проверяем сессию…" />;
  if (status === 'anonymous') {
    const returnTo = `${location.pathname}${location.search}`;
    const search = returnTo !== '/' ? `?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}` : '';
    return <Navigate to={`/login${search}`} replace />;
  }
  return <Outlet />;
}
