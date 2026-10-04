import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { addProject, addSource, backendHandlers, createDb, type Db } from '@/test/msw/backend';
import { server } from '@/test/msw/server';
import { renderWithApp } from '@/test/render';

import { screenRoutes } from './routes';

let db: Db;

beforeEach(() => {
  db = createDb();
  server.use(...backendHandlers(db));
});

async function openFromProject() {
  const project = addProject(db, { name: 'Шлюз' });
  addSource(db, project.id, { name: 'Базовая спецификация' });
  const user = userEvent.setup({ applyAccept: false });
  const view = renderWithApp({ routes: screenRoutes, initialEntries: [`/projects/${project.id}`] });
  const [headerButton] = await screen.findAllByRole('button', { name: 'Загрузить документ' });
  if (!headerButton) throw new Error('нет кнопки');
  await user.click(headerButton);
  const dialog = await screen.findByRole('dialog', { name: 'Загрузка документа' });
  return { project, user, dialog, ...view };
}

describe('Загрузка документа', () => {
  it('отклоняет .doc по правилам capabilities, «Далее» недоступна', async () => {
    const { user, dialog } = await openFromProject();
    await user.upload(within(dialog).getByLabelText('Файл документа'), new File(['x'], 'old.doc'));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Формат .doc не поддерживается');
    expect(within(dialog).getByRole('button', { name: 'Далее' })).toBeDisabled();
  });

  it('загружает файл, создаёт специфичный источник и запускает анализ', async () => {
    const { user, dialog, project } = await openFromProject();
    await user.upload(
      within(dialog).getByLabelText('Файл документа'),
      new File(['# API'], 'api.md'),
    );
    expect(within(dialog).getByText('api.md')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Далее' }));

    expect(await within(dialog).findByText('Базовая спецификация')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('tab', { name: 'Заметка' }));
    await user.type(within(dialog).getByLabelText('Название'), 'Решение архитектора');
    await user.type(within(dialog).getByLabelText('Текст заметки'), 'Лимит 100 rps');
    await user.click(within(dialog).getByRole('button', { name: 'Добавить заметку' }));
    // «Назад» сохраняет файл и введённые источники
    await user.click(within(dialog).getByRole('button', { name: 'Назад' }));
    expect(within(dialog).getByText('api.md')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Далее' }));
    expect(within(dialog).getByText('Решение архитектора')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Запустить анализ' }));
    expect(
      await within(dialog).findByText(/сравнивает документ с источниками истины/),
    ).toBeInTheDocument();

    const doc = db.documents.find((d) => d.name === 'api.md');
    expect(doc?.projectId).toBe(project.id);
    const note = db.requests.find((r) => r.path.endsWith('/sources/note'));
    expect(note?.body).toMatchObject({
      scope: 'document',
      document_id: doc?.id,
      text_content: 'Лимит 100 rps',
    });
    const order = db.requests
      .filter((r) => r.method === 'POST')
      .map((r) => r.path.split('/').slice(-1)[0]);
    expect(order).toEqual(['documents', 'note', 'analysis-jobs']);

    await user.click(within(dialog).getByRole('button', { name: 'Закрыть окно' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Идёт анализ')).toBeInTheDocument();
  });

  it('ошибка сервера при загрузке: остаёмся в форме с сообщением', async () => {
    server.use(
      http.post('/api/v1/projects/:projectId/documents', () =>
        HttpResponse.json({ detail: 'Файл больше 50 МБ' }, { status: 413 }),
      ),
    );
    const { user, dialog } = await openFromProject();
    await user.upload(within(dialog).getByLabelText('Файл документа'), new File(['x'], 'big.docx'));
    await user.click(within(dialog).getByRole('button', { name: 'Далее' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Запустить анализ' }));
    expect(await within(dialog).findByText('Документ не загружен')).toBeInTheDocument();
    expect(within(dialog).getByText('Файл больше 50 МБ')).toBeInTheDocument();
    expect(db.documents).toHaveLength(0);
  });

  it('если задача не создалась, документ остаётся черновиком и повтор не загружает файл заново', async () => {
    let attempts = 0;
    server.use(
      http.post('/api/v1/projects/:projectId/documents/:documentId/analysis-jobs', () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ detail: 'Слишком много запросов' }, { status: 429 })
          : HttpResponse.json(
              {
                id: 'job-1',
                document_id: 'x',
                status: 'pending',
                error_code: null,
                error_message: null,
                retry_count: 0,
                created_at: '2026-10-04T10:00:00Z',
                started_at: null,
                finished_at: null,
                partial_success: false,
              },
              { status: 202 },
            );
      }),
    );
    const { user, dialog } = await openFromProject();
    await user.upload(within(dialog).getByLabelText('Файл документа'), new File(['x'], 'a.txt'));
    await user.click(within(dialog).getByRole('button', { name: 'Далее' }));
    await user.click(await within(dialog).findByRole('button', { name: 'Запустить анализ' }));
    expect(
      await within(dialog).findByText('Документ загружен, но анализ не запущен'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Запустить анализ' }));
    await waitFor(() => expect(attempts).toBe(2));
    expect(
      db.requests.filter((r) => r.method === 'POST' && r.path.endsWith('/documents')),
    ).toHaveLength(1);
  });

  it('из «Моих документов» требует выбрать проект', async () => {
    addProject(db, { name: 'Первый' });
    const user = userEvent.setup();
    renderWithApp({ routes: screenRoutes, initialEntries: ['/documents'] });
    const [button] = await screen.findAllByRole('button', { name: 'Загрузить документ' });
    if (!button) throw new Error('нет кнопки');
    await user.click(button);
    const dialog = await screen.findByRole('dialog');
    await user.upload(within(dialog).getByLabelText('Файл документа'), new File(['x'], 'a.md'));
    const next = within(dialog).getByRole('button', { name: 'Далее' });
    expect(next).toBeDisabled();
    await user.selectOptions(await within(dialog).findByLabelText('Проект'), 'Первый');
    expect(next).toBeEnabled();
  });
});
