import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { REANALYSIS_TITLE } from '@/features/analysis';
import {
  addDocument,
  addJob,
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

function setup() {
  const project = addProject(db, { name: 'Платёжный шлюз' });
  addSource(db, project.id, { name: 'Спецификация API' });
  const draft = addDocument(db, project.id, { name: 'draft.md', status: 'draft' });
  const review = addDocument(db, project.id, { name: 'review.md', status: 'awaiting_approval' });
  const ready = addDocument(db, project.id, { name: 'ready.md', status: 'ready' });
  addSource(db, project.id, { name: 'Тикет PAY-12', scope: 'document', documentId: review.id });
  const view = renderWithApp({ routes: screenRoutes, initialEntries: [`/projects/${project.id}`] });
  return { project, draft, review, ready, ...view };
}

describe('Страница проекта', () => {
  it('показывает цепочку, базовые источники и документы со счётчиком', async () => {
    setup();
    expect(
      await screen.findByRole('heading', { name: 'Платёжный шлюз', level: 1 }),
    ).toBeInTheDocument();
    const breadcrumbs = screen.getByRole('navigation', { name: 'Навигационная цепочка' });
    expect(within(breadcrumbs).getByRole('link', { name: 'Проекты' })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(screen.getByText(/3 документа/)).toBeInTheDocument();
    expect(screen.getByText('Спецификация API')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Анализировать/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Проверить актуальность/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Рассмотреть правки' })).toBeInTheDocument();
  });

  it('раскрывает только одну строку источников; на ревью источники только для просмотра', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByRole('heading', { level: 1 });
    const toggles = screen.getAllByRole('button', { name: /Специфичные источники/ });
    const [draftToggle, reviewToggle] = toggles;
    if (!draftToggle || !reviewToggle) throw new Error('нет кнопок источников');

    await user.click(draftToggle);
    expect(draftToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Добавить файл' })).toBeInTheDocument();

    await user.click(reviewToggle);
    expect(draftToggle).toHaveAttribute('aria-expanded', 'false');
    expect(reviewToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Тикет PAY-12')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Добавить файл' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Удалить источник Тикет PAY-12' }),
    ).not.toBeInTheDocument();
  });

  it('групповой анализ берёт draft и ready, а ready запускает после подтверждения', async () => {
    const user = userEvent.setup();
    const { draft, ready } = setup();
    await user.click(await screen.findByRole('button', { name: 'Анализ всех документов' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText(/Текущие результаты анализа будут заменены/),
    ).toBeInTheDocument();
    const firstCall = db.requests.find((r) => r.path.endsWith('/analysis-jobs/bulk'));
    expect(firstCall?.body).toEqual({ document_ids: [draft.id, ready.id], force: false });

    await user.click(within(dialog).getByRole('button', { name: 'Запустить анализ' }));
    await waitFor(() =>
      expect(
        db.requests.filter((r) => r.path.endsWith('/analysis-jobs/bulk')).at(-1)?.body,
      ).toEqual({
        document_ids: [ready.id],
        force: true,
      }),
    );
    expect(await screen.findAllByText('Идёт анализ')).toHaveLength(2);
  });

  it('повторная проверка готового документа идёт через подтверждение и Idempotency-Key', async () => {
    const user = userEvent.setup();
    const { ready } = setup();
    await user.click(await screen.findByRole('button', { name: /Проверить актуальность/ }));
    const dialog = await screen.findByRole('alertdialog', { name: REANALYSIS_TITLE });
    await user.click(within(dialog).getByRole('button', { name: 'Запустить анализ' }));
    await waitFor(() => {
      const call = db.requests.find((r) => r.path.endsWith(`/documents/${ready.id}/analysis-jobs`));
      expect(call?.body).toEqual({ force: true });
      expect(call?.headers?.['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  it('показывает причину неудачного анализа у черновика', async () => {
    const project = addProject(db);
    const doc = addDocument(db, project.id, { name: 'failed.md', status: 'draft' });
    const job = addJob(db, doc.id, {
      status: 'failed',
      error_code: 'LLM_UNAVAILABLE',
      error_message: 'Модель не ответила вовремя',
    });
    doc.currentJobId = job.id;
    renderWithApp({ routes: screenRoutes, initialEntries: [`/projects/${project.id}`] });
    expect(
      await screen.findByLabelText('Анализ не удался: Модель не ответила вовремя'),
    ).toBeInTheDocument();
  });

  it('несуществующий проект — страница 404', async () => {
    renderWithApp({ routes: screenRoutes, initialEntries: ['/projects/unknown'] });
    expect(await screen.findByText(/не найден/i)).toBeInTheDocument();
  });
});
