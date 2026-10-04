import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { DELETE_PROJECT_TEXT } from '@/features/projects';
import {
  addDocument,
  addProject,
  addSource,
  backendHandlers,
  createDb,
  type Db,
} from '@/test/msw/backend';
import { server } from '@/test/msw/server';
import { renderWithApp } from '@/test/render';

import { screenRoutes } from './routes';

let db: Db;

beforeEach(() => {
  db = createDb();
  server.use(...backendHandlers(db));
});

const renderProjects = () => renderWithApp({ routes: screenRoutes, initialEntries: ['/projects'] });

describe('Раздел «Проекты»', () => {
  it('показывает пустое состояние с кнопкой создания', async () => {
    renderProjects();
    expect(await screen.findByText('Пока нет проектов')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Новый проект' })).toHaveLength(2);
  });

  it('показывает карточки и счётчик проектов', async () => {
    addProject(db, { name: 'Альфа' });
    addProject(db, { name: 'Бета', description: null });
    renderProjects();
    expect(await screen.findByRole('link', { name: 'Альфа' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/projects\/p-/),
    );
    expect(screen.getByText('2 проекта')).toBeInTheDocument();
    expect(screen.getByText('Без описания')).toBeInTheDocument();
  });

  it('создаёт проект с базовым источником и открывает его страницу', async () => {
    const user = userEvent.setup();
    const { router } = renderProjects();
    await user.click(await screen.findByRole('button', { name: 'Новый проект' }));
    const dialog = await screen.findByRole('dialog', { name: 'Новый проект' });
    const create = within(dialog).getByRole('button', { name: 'Создать проект' });
    expect(create).toBeDisabled();

    await user.type(within(dialog).getByLabelText('Название проекта'), 'Мобильное приложение');
    await user.click(within(dialog).getByRole('tab', { name: 'Ссылка' }));
    await user.type(
      within(dialog).getByLabelText('Адрес ссылки'),
      'https://wiki.example.com/mobile',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Добавить ссылку' }));
    expect(within(dialog).getByText('wiki.example.com/mobile')).toBeInTheDocument();

    await user.click(create);
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/projects\/p-/));
    const sourceRequest = db.requests.find(
      (r) => r.method === 'POST' && r.path.endsWith('/sources'),
    );
    expect(sourceRequest?.body).toMatchObject({
      scope: 'project',
      type: 'url',
      url: 'https://wiki.example.com/mobile',
    });
    expect(
      await screen.findByRole('heading', { name: 'Мобильное приложение', level: 1 }),
    ).toBeInTheDocument();
  });

  it('честно сообщает, что проект создан, если источник не добавился', async () => {
    server.use(
      http.post('/api/v1/projects/:projectId/sources', () =>
        HttpResponse.json({ detail: 'Адрес указывает на внутреннюю сеть' }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    const { router } = renderProjects();
    await user.click(await screen.findByRole('button', { name: 'Новый проект' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Название проекта'), 'Проект');
    await user.click(within(dialog).getByRole('tab', { name: 'Ссылка' }));
    await user.type(within(dialog).getByLabelText('Адрес ссылки'), 'http://10.0.0.1/wiki');
    await user.click(within(dialog).getByRole('button', { name: 'Добавить ссылку' }));
    await user.click(within(dialog).getByRole('button', { name: 'Создать проект' }));

    expect(
      await screen.findByText('Проект создан, но часть источников не добавилась'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Адрес указывает на внутреннюю сеть/)).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/projects\/p-/));
  });

  it('при ошибке создания окно остаётся открытым и данные сохраняются', async () => {
    server.use(
      http.post('/api/v1/projects', () =>
        HttpResponse.json({ detail: 'Сервис недоступен' }, { status: 503 }),
      ),
    );
    const user = userEvent.setup();
    renderProjects();
    await user.click(await screen.findByRole('button', { name: 'Новый проект' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Название проекта'), 'Проект');
    await user.click(within(dialog).getByRole('button', { name: 'Создать проект' }));
    expect(await within(dialog).findByText('Сервис недоступен')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Название проекта')).toHaveValue('Проект');
  });

  it('переименовывает проект; сохранение недоступно без изменений', async () => {
    addProject(db, { name: 'Старое имя' });
    const user = userEvent.setup();
    const { router } = renderProjects();
    await user.click(await screen.findByRole('button', { name: 'Действия с проектом Старое имя' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Переименовать' }));
    expect(router.state.location.pathname).toBe('/projects');

    const dialog = await screen.findByRole('dialog', { name: 'Переименовать проект' });
    const save = within(dialog).getByRole('button', { name: 'Сохранить' });
    expect(save).toBeDisabled();
    const input = within(dialog).getByLabelText('Название проекта');
    await user.clear(input);
    expect(save).toBeDisabled();
    await user.type(input, 'Новое имя');
    await user.click(save);
    expect(await screen.findByRole('link', { name: 'Новое имя' })).toBeInTheDocument();
  });

  it('удаляет проект после подтверждения с текстом из описания UI', async () => {
    addProject(db, { name: 'Удаляемый' });
    const user = userEvent.setup();
    renderProjects();
    await user.click(await screen.findByRole('button', { name: 'Действия с проектом Удаляемый' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Удалить' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Удалить проект?' });
    expect(within(dialog).getByText(DELETE_PROJECT_TEXT)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Удалить' }));
    expect(await screen.findByText('Пока нет проектов')).toBeInTheDocument();
  });

  it('показывает реальные счётчики документов и базовых источников', async () => {
    const project = addProject(db, { name: 'Счётчики' });
    const doc = addDocument(db, project.id);
    addDocument(db, project.id, { name: 'second.md' });
    addSource(db, project.id);
    addSource(db, project.id, { scope: 'document', documentId: doc.id });
    renderProjects();
    const card = (await screen.findByRole('link', { name: 'Счётчики' })).closest('article');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText('2 документа')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('1 источник')).toBeInTheDocument();
  });

  it('создаёт проект с выбранным цветом и иконкой, без выбора цвет оставляет серверу', async () => {
    const user = userEvent.setup();
    renderProjects();
    await user.click(await screen.findByRole('button', { name: 'Новый проект' }));
    const dialog = await screen.findByRole('dialog', { name: 'Новый проект' });
    const colors = within(dialog).getByRole('radiogroup', { name: 'Цвет' });
    expect(within(colors).getByRole('radio', { name: 'Автоматически' })).toBeChecked();
    expect(
      within(within(dialog).getByRole('radiogroup', { name: 'Иконка' })).getByRole('radio', {
        name: 'По умолчанию',
      }),
    ).toBeChecked();

    await user.type(within(dialog).getByLabelText('Название проекта'), 'Цветной');
    await user.click(within(colors).getByRole('radio', { name: 'Розовый' }));
    await user.click(within(dialog).getByRole('radio', { name: 'Ракета' }));
    await user.click(within(dialog).getByRole('button', { name: 'Создать проект' }));

    await waitFor(() =>
      expect(
        db.requests.find((r) => r.method === 'POST' && r.path === '/api/v1/projects')?.body,
      ).toEqual({ name: 'Цветной', description: null, color: 'EC4899', icon: 'rocket' }),
    );
    expect(db.projects[0]).toMatchObject({ color: 'EC4899', icon: 'rocket' });
  });

  it('меняет оформление из меню карточки и сбрасывает иконку пустой строкой', async () => {
    addProject(db, { name: 'Оформляемый', color: '3B82F6', icon: 'rocket' });
    const user = userEvent.setup();
    renderProjects();
    await user.click(
      await screen.findByRole('button', { name: 'Действия с проектом Оформляемый' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Оформление' }));
    const dialog = await screen.findByRole('dialog', { name: 'Оформление проекта' });
    const save = within(dialog).getByRole('button', { name: 'Сохранить' });
    expect(save).toBeDisabled();
    expect(within(dialog).queryByRole('radio', { name: 'Автоматически' })).toBeNull();

    const blue = within(dialog).getByRole('radio', { name: 'Синий' });
    expect(blue).toBeChecked();
    blue.focus();
    await user.keyboard('{ArrowRight}');
    expect(within(dialog).getByRole('radio', { name: 'Фиолетовый' })).toHaveFocus();
    expect(within(dialog).getByRole('radio', { name: 'Фиолетовый' })).toBeChecked();
    await user.click(within(dialog).getByRole('radio', { name: 'По умолчанию' }));
    await user.click(save);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const patch = db.requests.find((r) => r.method === 'PATCH');
    expect(patch?.body).toEqual({ color: '8B5CF6', icon: '' });
    expect(db.projects[0]).toMatchObject({ color: '8B5CF6', icon: null });
  });

  it('оставляет окно оформления открытым с ошибкой сервера', async () => {
    const project = addProject(db, { name: 'Ошибочный', color: '3B82F6' });
    server.use(
      http.patch(`/api/v1/projects/${project.id}`, () =>
        HttpResponse.json({ detail: 'Недопустимый цвет проекта' }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderProjects();
    await user.click(await screen.findByRole('button', { name: 'Действия с проектом Ошибочный' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Оформление' }));
    const dialog = await screen.findByRole('dialog', { name: 'Оформление проекта' });
    await user.click(within(dialog).getByRole('radio', { name: 'Красный' }));
    await user.click(within(dialog).getByRole('button', { name: 'Сохранить' }));
    expect(await within(dialog).findByText('Недопустимый цвет проекта')).toBeInTheDocument();
  });
});
