import { Link, useSearchParams } from 'react-router-dom';

import { AuthLayout, RegisterForm } from '@/features/auth';

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const loginLink = searchParams.size > 0 ? `/login?${searchParams.toString()}` : '/login';

  return (
    <AuthLayout
      title="Регистрация"
      description="Создайте аккаунт. После регистрации вы сразу войдёте в систему."
      footer={
        <>
          Уже есть аккаунт?{' '}
          <Link to={loginLink} className="font-medium text-primary hover:underline">
            Войти
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
