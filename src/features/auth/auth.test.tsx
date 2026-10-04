import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Outlet } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { authSession } from '@/api/authSession';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { TEST_TOKENS, TEST_USER, VALID_PASSWORD } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderWithApp } from '@/test/render';

import { useAuth } from './AuthProvider';
import { GuestOnly } from './components/GuestOnly';
import { RequireAuth } from './components/RequireAuth';

function Protected() {
  const { user } = useAuth();
  return <h1>Привет, {user?.email}</h1>;
}

const routes = [
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Outlet />,
        children: [
          { path: '/', element: <Protected /> },
          { path: '/projects/42', element: <Protected /> },
        ],
      },
    ],
  },
];

afterEach(() => {
  authSession.clear();
});

describe('аутентификация', () => {
  it('анонима с защищённой страницы ведёт на /login с returnTo', async () => {
    const { router } = renderWithApp({ routes, initialEntries: ['/projects/42'] });
    await screen.findByRole('heading', { name: 'Вход' });
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?returnTo=%2Fprojects%2F42');
  });

  it('после входа возвращает на returnTo и показывает пользователя', async () => {
    const user = userEvent.setup();
    const { router } = renderWithApp({
      routes,
      initialEntries: ['/login?returnTo=%2Fprojects%2F42'],
    });

    await user.type(await screen.findByLabelText('Email'), TEST_USER.email);
    await user.type(screen.getByLabelText('Пароль'), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    await screen.findByRole('heading', { name: `Привет, ${TEST_USER.email}` });
    expect(router.state.location.pathname).toBe('/projects/42');
    expect(authSession.getAccessToken()).toBe(TEST_TOKENS.access_token);
  });

  it('показывает текст ошибки сервера при неверном пароле', async () => {
    const user = userEvent.setup();
    renderWithApp({ routes, initialEntries: ['/login'] });

    await user.type(await screen.findByLabelText('Email'), TEST_USER.email);
    await user.type(screen.getByLabelText('Пароль'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль');
  });

  it('при 429 показывает сообщение о блокировке и не повторяет запрос', async () => {
    let calls = 0;
    server.use(
      http.post('/api/v1/auth/login', () => {
        calls += 1;
        return HttpResponse.json(
          { detail: 'Слишком много попыток входа' },
          { status: 429, headers: { 'Retry-After': '300' } },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithApp({ routes, initialEntries: ['/login'] });

    await user.type(await screen.findByLabelText('Email'), TEST_USER.email);
    await user.type(screen.getByLabelText('Пароль'), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Войти' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Слишком много попыток входа');
    expect(alert).toHaveTextContent('через 300 с');
    expect(calls).toBe(1);
  });

  it('регистрация показывает текст 422 от сервера (политика пароля)', async () => {
    const user = userEvent.setup();
    renderWithApp({ routes, initialEntries: ['/register'] });

    await user.type(await screen.findByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Пароль'), 'weakweak');
    await user.type(screen.getByLabelText('Повторите пароль'), 'weakweak');
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Пароль должен содержать цифру');
  });

  it('после успешной регистрации выполняет вход и открывает приложение', async () => {
    server.use(
      http.post('/api/v1/auth/login', () => HttpResponse.json(TEST_TOKENS)),
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json({ ...TEST_USER, email: 'new@example.com' }),
      ),
    );
    const user = userEvent.setup();
    const { router } = renderWithApp({ routes, initialEntries: ['/register'] });

    await user.type(await screen.findByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Пароль'), VALID_PASSWORD);
    await user.type(screen.getByLabelText('Повторите пароль'), VALID_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Создать аккаунт' }));

    await screen.findByRole('heading', { name: 'Привет, new@example.com' });
    expect(router.state.location.pathname).toBe('/');
  });

  it('восстанавливает сессию по refresh-токену из localStorage', async () => {
    window.localStorage.setItem('syncscribe.refresh_token', TEST_TOKENS.refresh_token);
    // Синглтон уже создан, поэтому задаём токен напрямую той же парой.
    authSession.setTokens({ ...TEST_TOKENS, access_token: 'stale', expires_in: 0 });

    renderWithApp({ routes, initialEntries: ['/'] });

    await screen.findByRole('heading', { name: `Привет, ${TEST_USER.email}` });
    await waitFor(() => expect(authSession.getRefreshToken()).toBe('refresh-token-2'));
  });
});
