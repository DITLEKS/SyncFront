import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { ATTENTION_ALL_LINK, RECENT_EMPTY_TEXT } from '@/features/dashboard';
import { RealtimeProvider, useRealtimeStore } from '@/features/sse';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { addDocument, addProject, backendHandlers, createDb, type Db } from '@/test/msw/backend';
import { createTestEventStream, type TestEventStream } from '@/test/msw/eventStream';
import { server } from '@/test/msw/server';
import { renderWithApp } from '@/test/render';

function LocationProbe() {
  const location = useLocation();
  return <h1>Адрес {location.pathname + location.search}</h1>;
}

const routes = [
  {
    path: '/',
    element: (
      <RealtimeProvider>
        <WorkspacePage />
      </RealtimeProvider>
    ),
  },
  { path: '*', element: <LocationProbe /> },
];

let db: Db;
let events: TestEventStream;

beforeEach(() => {
  db = createDb();
  events = createTestEventStream();
  server.use(events.handler, ...backendHandlers(db));
});

function seed() {
  const project = addProject(db, { name: 'Платёжный шлюз' });
  const docs = [
    addDocument(db, project.id, {
      name: 'auth.md',
      status: 'awaiting_approval',
      suggestions: { total: 6, pending: 5, accepted: 1, rejected: 0 },
      lastOpenedAt: '2026-10-03T10:00:00Z',
    }),
    addDocument(db, project.id, {
      name: 'webhooks.md',
      status: 'ready',
      suggestions: { total: 4, pending: 0, accepted: 3, rejected: 1 },
      uploadedAt: '2026-09-15T09:00:00Z',
      lastOpenedAt: '2026-10-04T10:00:00Z',
    }),
    addDocument(db, project.id, { name: 'limits.md', status: 'in_progress' }),
  ];
  return { project, docs };
}

describe('Рабочее пространство', () => {
  it('показывает показатели, «Требуют внимания» и недавние документы по данным сервера', async () => {
    const { project, docs } = seed();
    renderWithApp({ routes });

    const metrics = await screen.findByRole('list', { name: 'Показатели' });
    expect(within(metrics).getByText('Всего документов').closest('li')).toHaveTextContent('3');
    expect(within(metrics).getByText('Ожидают утверждения').closest('li')).toHaveTextContent('1');
    expect(within(metrics).getByText('Актуальность базы').closest('li')).toHaveTextContent(/33\s%/);

    const attention = await screen.findByRole('region', { name: /Требуют внимания/ });
    const card = within(attention).getByRole('link', { name: /auth\.md/ });
    expect(card).toHaveAttribute('href', `/projects/${project.id}/documents/${docs[0]?.id}`);
    expect(card).toHaveTextContent('5 предложений ИИ');
    expect(card).toHaveTextContent('Открыть в редакторе');
    // Документов на утверждении не больше четырёх — ссылка «Посмотреть все» не нужна.
    expect(within(attention).queryByRole('link', { name: /Посмотреть все/ })).toBeNull();

    const recent = screen.getByRole('region', { name: 'Недавние документы' });
    const rows = await within(recent).findAllByRole('row');
    // Заголовок + два открытых документа, свежий сверху.
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('webhooks.md');
    expect(rows[1]).toHaveTextContent('4/4');
    // В столбце «Дата» — дата загрузки, а не открытия.
    expect(rows[1]).toHaveTextContent(/15 сент\.? 2026/);
    expect(
      within(rows[1] as HTMLElement).getByRole('link', { name: 'Платёжный шлюз' }),
    ).toHaveAttribute('href', `/projects/${project.id}`);
    expect(rows[2]).toHaveTextContent('Ожидает утверждения');
  });

  it('скрывает «Требуют внимания» без документов и показывает пустые недавние', async () => {
    renderWithApp({ routes });
    expect(await screen.findByText(RECENT_EMPTY_TEXT.title)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Требуют внимания/ })).toBeNull();
    expect(
      within(screen.getByRole('list', { name: 'Показатели' }))
        .getByText('Актуальность базы')
        .closest('li'),
    ).toHaveTextContent('—');
  });

  it('при пяти документах на утверждении ведёт «Посмотреть все» на отфильтрованный список', async () => {
    const user = userEvent.setup();
    const project = addProject(db);
    for (let i = 0; i < 5; i += 1) {
      addDocument(db, project.id, { name: `doc-${i}.md`, status: 'awaiting_approval' });
    }
    renderWithApp({ routes });

    const attention = await screen.findByRole('region', { name: /Требуют внимания/ });
    expect(await within(attention).findAllByRole('listitem')).toHaveLength(4);
    expect(within(attention).getByText('5')).toBeInTheDocument();
    await user.click(within(attention).getByRole('link', { name: /Посмотреть все/ }));
    expect(
      await screen.findByRole('heading', { name: `Адрес ${ATTENTION_ALL_LINK}` }),
    ).toBeInTheDocument();
  });

  it('ошибка одного блока не скрывает остальные и повторяется по кнопке', async () => {
    const user = userEvent.setup();
    seed();
    let fail = true;
    server.use(
      http.get('/api/v1/documents/recent', () =>
        fail
          ? HttpResponse.json({ detail: 'Сервис недоступен' }, { status: 503 })
          : HttpResponse.json([]),
      ),
    );
    renderWithApp({ routes });

    const recent = await screen.findByRole('region', { name: 'Недавние документы' });
    expect(await within(recent).findByText('Сервис недоступен')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Показатели' })).toBeInTheDocument();

    fail = false;
    await user.click(within(recent).getByRole('button', { name: 'Повторить' }));
    expect(await within(recent).findByText(RECENT_EMPTY_TEXT.title)).toBeInTheDocument();
  });

  it('быстрые действия ведут в разделы и открывают загрузку', async () => {
    const user = userEvent.setup();
    renderWithApp({ routes });
    const actions = await screen.findByRole('region', { name: 'Быстрые действия' });
    expect(within(actions).getByRole('link', { name: /Все документы/ })).toHaveAttribute(
      'href',
      '/documents',
    );
    expect(within(actions).getByRole('link', { name: /Мои проекты/ })).toHaveAttribute(
      'href',
      '/projects',
    );
    await user.click(within(actions).getByRole('button', { name: /Загрузить/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('обновляется по SSE-событию без опроса и переподключается после обрыва', async () => {
    const { docs } = seed();
    renderWithApp({ routes });
    await screen.findByRole('list', { name: 'Показатели' });
    await waitFor(() => expect(useRealtimeStore.getState().state).toBe('open'));

    const analysed = docs[2];
    if (!analysed) throw new Error('seed');
    analysed.status = 'ready';
    events.send('document_status_changed', {
      event: 'document_status_changed',
      document_id: analysed.id,
      project_id: analysed.projectId,
      status: 'ready',
      current_analysis_job_id: null,
    });

    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Показатели' }))
          .getByText('Актуальность базы')
          .closest('li'),
      ).toHaveTextContent(/67\s%/),
    );

    events.drop();
    await waitFor(() => expect(events.connections()).toBe(2), { timeout: 3000 });
    await waitFor(() => expect(useRealtimeStore.getState().state).toBe('open'));
  });
});
