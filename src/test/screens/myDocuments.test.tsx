import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { DELETE_DOCUMENT_TEXT, EMPTY_TEXTS } from '@/features/documents';
import { addDocument, addProject, backendHandlers, createDb, type Db } from '@/test/msw/backend';
import { server } from '@/test/msw/server';
import { renderWithApp } from '@/test/render';

import { screenRoutes } from './routes';

let db: Db;

beforeEach(() => {
  db = createDb();
  server.use(...backendHandlers(db));
});

const renderDocuments = (entry = '/documents') =>
  renderWithApp({ routes: screenRoutes, initialEntries: [entry] });

function seed() {
  const project = addProject(db, { name: 'Шлюз' });
  addDocument(db, project.id, {
    name: 'guide.md',
    status: 'awaiting_approval',
    suggestions: { total: 7, pending: 3, accepted: 3, rejected: 1 },
  });
  addDocument(db, project.id, { name: 'notes.txt', status: 'in_progress', format: 'txt' });
  return project;
}

describe('Раздел «Мои документы»', () => {
  it('без документов — текст из описания UI и кнопка загрузки', async () => {
    renderDocuments();
    expect(await screen.findByText(EMPTY_TEXTS.no_documents)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Загрузить документ' })).toHaveLength(2);
  });

  it('таблица: плашка проекта, «Изм.» с прочерком, блокировка удаления в работе', async () => {
    const project = seed();
    renderDocuments();
    const guideRow = (await screen.findByRole('link', { name: 'guide.md' })).closest('tr');
    const notesRow = screen.getByRole('link', { name: 'notes.txt' }).closest('tr');
    if (!guideRow || !notesRow) throw new Error('нет строк');
    expect(within(guideRow).getByRole('link', { name: 'Шлюз' })).toHaveAttribute(
      'href',
      `/projects/${project.id}`,
    );
    expect(within(guideRow).getByText('7')).toBeInTheDocument();
    expect(within(notesRow).getByText('—')).toBeInTheDocument();
    expect(within(notesRow).getByRole('button', { name: 'Удалить notes.txt' })).toBeDisabled();
    expect(screen.getByText('2 документа')).toBeInTheDocument();
  });

  it('фильтр по статусу пишется в URL и даёт пустую категорию', async () => {
    seed();
    const user = userEvent.setup();
    const { router } = renderDocuments();
    await screen.findByRole('link', { name: 'guide.md' });
    await user.click(screen.getByRole('radio', { name: 'Готово' }));
    await waitFor(() => expect(router.state.location.search).toBe('?status=ready'));
    expect(await screen.findByText(EMPTY_TEXTS.empty_category)).toBeInTheDocument();
    expect(db.requests.some((r) => r.path.includes('status=ready'))).toBe(true);
  });

  it('открывается с фильтром из URL', async () => {
    seed();
    renderDocuments('/documents?status=awaiting_approval');
    expect(await screen.findByRole('radio', { name: 'Ожидает утверждения' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(await screen.findByRole('link', { name: 'guide.md' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'notes.txt' })).not.toBeInTheDocument();
  });

  it('поиск с задержкой отправляет search и показывает «ничего не найдено»', async () => {
    seed();
    const user = userEvent.setup();
    const { router } = renderDocuments();
    await screen.findByRole('link', { name: 'guide.md' });
    await user.type(screen.getByRole('searchbox', { name: /Поиск документов/ }), 'zzz');
    expect(await screen.findByText(EMPTY_TEXTS.nothing_found)).toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=zzz');
    const searches = db.requests.filter((r) => r.path.includes('search='));
    expect(searches.map((r) => new URL(r.path, 'http://x').searchParams.get('search'))).toEqual([
      'zzz',
    ]);
  });

  it('клик по строке открывает документ, по плашке — проект', async () => {
    const project = seed();
    const user = userEvent.setup();
    const { router } = renderDocuments();
    const row = (await screen.findByRole('link', { name: 'guide.md' })).closest('tr');
    if (!row) throw new Error('нет строки');
    await user.click(within(row).getByText('7'));
    expect(router.state.location.pathname).toMatch(
      new RegExp(`^/projects/${project.id}/documents/`),
    );
  });

  it('удаляет документ после подтверждения', async () => {
    seed();
    const user = userEvent.setup();
    renderDocuments();
    await user.click(await screen.findByRole('button', { name: 'Удалить guide.md' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Удалить документ?' });
    expect(within(dialog).getByText(DELETE_DOCUMENT_TEXT)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Удалить' }));
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'guide.md' })).not.toBeInTheDocument(),
    );
    expect(screen.getByText('1 документ')).toBeInTheDocument();
  });
});
