import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { authSession } from '@/api/authSession';
import { TEST_TOKENS, TEST_USER } from '@/test/msw/handlers';
import { renderWithApp } from '@/test/render';

import { AppShell } from './AppShell';

afterEach(() => authSession.clear());

function renderShell() {
  authSession.setTokens(TEST_TOKENS);
  return renderWithApp({
    routes: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <h1>Рабочее пространство</h1> },
          { path: '/projects', element: <h1>Список проектов</h1> },
          { path: '/documents', element: <h1>Список документов</h1> },
        ],
      },
      { path: '/login', element: <h1>Вход</h1> },
    ],
  });
}

describe('AppShell: оформление не меняет поведение навигации и аккаунта', () => {
  it('сворачивает и разворачивает меню, сохраняет состояние и доступные имена ссылок', async () => {
    const user = userEvent.setup();
    renderShell();
    const toggle = screen.getByRole('button', { name: 'Свернуть меню' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Развернуть меню' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(window.localStorage.getItem('syncscribe.sidebar.collapsed')).toBe('1');
    expect(screen.getByRole('link', { name: 'Проекты' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Развернуть меню' }));
    expect(window.localStorage.getItem('syncscribe.sidebar.collapsed')).toBe('0');
    expect(screen.getByRole('button', { name: 'Свернуть меню' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Рабочее пространство' })).toHaveClass('bg-accent');
  });

  it('восстанавливает свёрнутое меню и переключает активный раздел', async () => {
    window.localStorage.setItem('syncscribe.sidebar.collapsed', '1');
    const user = userEvent.setup();
    renderShell();
    expect(screen.getByRole('button', { name: 'Развернуть меню' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Мои документы' }));
    expect(screen.getByRole('heading', { name: 'Список документов' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Мои документы' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Мои документы' })).toHaveClass('bg-accent', 'h-12');
  });

  it('показывает настоящий аккаунт и сохраняет выход из системы', async () => {
    const user = userEvent.setup();
    renderShell();
    await waitFor(() => expect(screen.getByText(TEST_USER.email)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Настройки' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Аккаунт' }));
    expect(screen.getByRole('menu')).toHaveTextContent(TEST_USER.email);
    await user.click(screen.getByRole('menuitem', { name: 'Выйти' }));
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(authSession.getAccessToken()).toBeNull();
  });
});
