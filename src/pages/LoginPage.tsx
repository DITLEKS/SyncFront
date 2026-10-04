import { Link, useSearchParams } from 'react-router-dom';

import { AuthLayout, LoginForm } from '@/features/auth';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const registerLink = searchParams.size > 0 ? `/register?${searchParams.toString()}` : '/register';

  return (
    <AuthLayout
      title="Вход"
      description="Войдите, чтобы продолжить работу с документами."
      footer={
        <>
          Нет аккаунта?{' '}
          <Link to={registerLink} className="font-medium text-primary hover:underline">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
