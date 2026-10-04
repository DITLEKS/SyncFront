import { Navigate, Outlet, useSearchParams } from 'react-router-dom';

import { useAuth } from '../AuthProvider';
import { FullPageSpinner } from './FullPageSpinner';
import { RETURN_TO_PARAM, sanitizeReturnTo } from '../model/returnTo';

/** Страницы входа и регистрации недоступны вошедшему пользователю. */
export function GuestOnly() {
  const { status } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'loading') return <FullPageSpinner label="Проверяем сессию…" />;
  if (status === 'authenticated') {
    return <Navigate to={sanitizeReturnTo(searchParams.get(RETURN_TO_PARAM))} replace />;
  }
  return <Outlet />;
}
