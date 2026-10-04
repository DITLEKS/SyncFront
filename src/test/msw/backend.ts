/**
 * Небольшой бэкенд в памяти для интеграционных тестов экранов проектов и документов.
 * Повторяет контракт SyncBack: счётчики проекта считаются по документам и базовым источникам,
 * цвет назначается по кругу палитры, вложенный detail у 409 confirmation_required.
 * analysis в списках не заполняется — так проверяется запасной путь через задачу анализа.
 */
import { HttpResponse, http } from 'msw';

import type {
  AnalysisJobResponse,
  DocumentListItem,
  DocumentResponse,
  ProjectResponse,
  SourceResponse,
} from '@/api/types';
import type { DocumentStatus } from '@/domain/document/status';
import { PROJECT_COLORS } from '@/domain/project/appearance';

import { TEST_USER } from './handlers';

interface DbDocument {
  id: string;
  projectId: string;
  name: string;
  format: string;
  size: number;
  status: DocumentStatus;
  uploadedAt: string;
  currentJobId: string | null;
  suggestions: { total: number; pending: number; accepted: number; rejected: number };
  lastOpenedAt: string | null;
}

interface DbSource extends SourceResponse {
  documentId: string | null;
}

export interface Db {
  projects: ProjectResponse[];
  documents: DbDocument[];
  sources: DbSource[];
  jobs: AnalysisJobResponse[];
  requests: { method: string; path: string; body?: unknown; headers?: Record<string, string> }[];
}

let seq = 0;
export const id = (prefix: string) => {
  seq += 1;
  return `${prefix}-${String(seq).padStart(4, '0')}-4000-8000-000000000000`;
};

export function createDb(): Db {
  return { projects: [], documents: [], sources: [], jobs: [], requests: [] };
}

export function addProject(db: Db, patch: Partial<ProjectResponse> = {}): ProjectResponse {
  const project: ProjectResponse = {
    id: id('p'),
    name: 'Платёжный шлюз',
    description: 'Документация API',
    owner_id: TEST_USER.id,
    created_at: '2026-09-01T10:00:00Z',
    document_count: 0,
    source_count: 0,
    color: null,
    icon: null,
    ...patch,
  };
  db.projects.push(project);
  return project;
}

/** Проект в виде ответа сервера: счётчики считаются по текущему состоянию базы. */
function projectView(db: Db, project: ProjectResponse): ProjectResponse {
  return {
    ...project,
    document_count: db.documents.filter((d) => d.projectId === project.id).length,
    source_count: db.sources.filter((s) => s.project_id === project.id && s.scope === 'project')
      .length,
  };
}

export function addDocument(
  db: Db,
  projectId: string,
  patch: Partial<DbDocument> = {},
): DbDocument {
  const doc: DbDocument = {
    id: id('d'),
    projectId,
    name: 'api-guide.md',
    format: 'markdown',
    size: 2048,
    status: 'draft',
    uploadedAt: '2026-09-10T09:00:00Z',
    currentJobId: null,
    suggestions: { total: 0, pending: 0, accepted: 0, rejected: 0 },
    lastOpenedAt: null,
    ...patch,
  };
  db.documents.push(doc);
  return doc;
}

export function addSource(db: Db, projectId: string, patch: Partial<DbSource> = {}): DbSource {
  const source: DbSource = {
    id: id('s'),
    project_id: projectId,
    name: 'confluence.example.com/api',
    type: 'url',
    scope: 'project',
    created_at: '2026-09-02T10:00:00Z',
    documentId: null,
    ...patch,
  };
  db.sources.push(source);
  return source;
}

export function addJob(
  db: Db,
  documentId: string,
  patch: Partial<AnalysisJobResponse> = {},
): AnalysisJobResponse {
  const job: AnalysisJobResponse = {
    id: id('j'),
    document_id: documentId,
    status: 'pending',
    error_code: null,
    error_message: null,
    retry_count: 0,
    created_at: '2026-09-10T09:05:00Z',
    started_at: null,
    finished_at: null,
    partial_success: false,
    ...patch,
  };
  db.jobs.push(job);
  return job;
}

function toResponse(doc: DbDocument): DocumentResponse {
  return {
    id: doc.id,
    project_id: doc.projectId,
    name: doc.name,
    format: doc.format,
    size_bytes: doc.size,
    uploaded_at: doc.uploadedAt,
    status: doc.status,
    current_analysis_job_id: doc.currentJobId,
    review_version: 0,
    analysis: null,
  };
}

function toListItem(db: Db, doc: DbDocument, withCounters: boolean): DocumentListItem {
  const project = db.projects.find((p) => p.id === doc.projectId);
  return {
    id: doc.id,
    name: doc.name,
    format: doc.format,
    size_bytes: doc.size,
    status: doc.status,
    current_analysis_job_id: doc.currentJobId,
    uploaded_at: doc.uploadedAt,
    updated_at: doc.uploadedAt,
    project: { id: doc.projectId, name: project?.name ?? '' },
    suggestions: withCounters
      ? doc.suggestions
      : { total: 0, pending: 0, accepted: 0, rejected: 0 },
    sources: db.sources
      .filter((s) => s.documentId === doc.id)
      .map((s) => ({ id: s.id, name: s.name, type: s.type })),
    analysis: null,
  };
}

const notFound = () => HttpResponse.json({ detail: 'Ресурс не найден' }, { status: 404 });

function stripSource(source: DbSource): SourceResponse {
  return {
    id: source.id,
    project_id: source.project_id,
    name: source.name,
    type: source.type,
    scope: source.scope,
    created_at: source.created_at,
  };
}

export function backendHandlers(db: Db) {
  const log = (request: Request, body?: unknown) => {
    const url = new URL(request.url);
    db.requests.push({
      method: request.method,
      path: url.pathname + url.search,
      body,
      headers: Object.fromEntries(request.headers.entries()),
    });
  };

  return [
    http.get('/api/v1/projects', ({ request }) => {
      log(request);
      const url = new URL(request.url);
      const limit = Number(url.searchParams.get('limit') ?? 50);
      const offset = Number(url.searchParams.get('offset') ?? 0);
      return HttpResponse.json({
        items: db.projects.slice(offset, offset + limit).map((p) => projectView(db, p)),
        total: db.projects.length,
        limit,
        offset,
      });
    }),
    http.post('/api/v1/projects', async ({ request }) => {
      const body = (await request.json()) as { name: string; description: string | null };
      log(request, body);
      const project = addProject(db, {
        name: body.name,
        description: body.description,
        color: PROJECT_COLORS[db.projects.length % PROJECT_COLORS.length],
      });
      return HttpResponse.json(projectView(db, project), { status: 201 });
    }),
    http.get('/api/v1/projects/:projectId', ({ request, params }) => {
      log(request);
      const project = db.projects.find((p) => p.id === params.projectId);
      if (!project) return notFound();
      const include = new URL(request.url).searchParams.getAll('include');
      return HttpResponse.json({
        ...projectView(db, project),
        sources: include.includes('sources')
          ? db.sources
              .filter((s) => s.project_id === project.id && s.scope === 'project')
              .map(stripSource)
          : null,
        documents: include.includes('documents')
          ? db.documents
              .filter((d) => d.projectId === project.id)
              .map((d) => toListItem(db, d, false))
          : null,
      });
    }),
    http.patch('/api/v1/projects/:projectId', async ({ request, params }) => {
      const body = (await request.json()) as { name?: string };
      log(request, body);
      const project = db.projects.find((p) => p.id === params.projectId);
      if (!project) return notFound();
      if (body.name) project.name = body.name;
      return HttpResponse.json(projectView(db, project));
    }),
    http.delete('/api/v1/projects/:projectId', ({ request, params }) => {
      log(request);
      db.projects = db.projects.filter((p) => p.id !== params.projectId);
      db.documents = db.documents.filter((d) => d.projectId !== params.projectId);
      return new HttpResponse(null, { status: 204 });
    }),

    http.get('/api/v1/documents', ({ request }) => {
      log(request);
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const search = url.searchParams.get('search')?.toLowerCase();
      const limit = Number(url.searchParams.get('limit') ?? 50);
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const items = db.documents
        .filter((d) => !status || d.status === status)
        .filter((d) => !search || d.name.toLowerCase().includes(search));
      return HttpResponse.json({
        items: items.slice(offset, offset + limit).map((d) => toListItem(db, d, true)),
        total: items.length,
        limit,
        offset,
      });
    }),
    http.post('/api/v1/projects/:projectId/documents', async ({ request, params }) => {
      const form = await request.formData();
      const file = form.get('file');
      log(request, { file: file instanceof File ? file.name : null });
      if (!(file instanceof File))
        return HttpResponse.json({ detail: 'file required' }, { status: 422 });
      const doc = addDocument(db, String(params.projectId), {
        name: file.name,
        size: file.size,
        format: file.name.endsWith('.docx')
          ? 'docx'
          : file.name.endsWith('.txt')
            ? 'txt'
            : 'markdown',
      });
      return HttpResponse.json(toResponse(doc), { status: 201 });
    }),
    http.get('/api/v1/projects/:projectId/documents/:documentId', ({ request, params }) => {
      log(request);
      const doc = db.documents.find((d) => d.id === params.documentId);
      return doc ? HttpResponse.json(toResponse(doc)) : notFound();
    }),
    http.delete('/api/v1/projects/:projectId/documents/:documentId', ({ request, params }) => {
      log(request);
      const doc = db.documents.find((d) => d.id === params.documentId);
      if (!doc) return notFound();
      if (doc.status === 'in_progress') {
        return HttpResponse.json({ detail: 'Документ анализируется' }, { status: 409 });
      }
      db.documents = db.documents.filter((d) => d.id !== doc.id);
      return new HttpResponse(null, { status: 204 });
    }),

    http.post('/api/v1/projects/:projectId/sources', async ({ request, params }) => {
      const body = (await request.json()) as {
        name: string;
        scope: 'project' | 'document';
        document_id?: string | null;
      };
      log(request, body);
      const source = addSource(db, String(params.projectId), {
        name: body.name,
        type: 'url',
        scope: body.scope,
        documentId: body.document_id ?? null,
      });
      return HttpResponse.json(stripSource(source), { status: 201 });
    }),
    http.post('/api/v1/projects/:projectId/sources/note', async ({ request, params }) => {
      const body = (await request.json()) as {
        name: string;
        scope: 'project' | 'document';
        document_id?: string | null;
      };
      log(request, body);
      const source = addSource(db, String(params.projectId), {
        name: body.name,
        type: 'file',
        scope: body.scope,
        documentId: body.document_id ?? null,
      });
      return HttpResponse.json(stripSource(source), { status: 201 });
    }),
    http.post('/api/v1/projects/:projectId/sources/file', async ({ request, params }) => {
      const form = await request.formData();
      const scope = form.get('scope') as 'project' | 'document';
      log(request, { name: form.get('name'), scope, document_id: form.get('document_id') });
      const source = addSource(db, String(params.projectId), {
        name: form.get('name') as string,
        type: 'file',
        scope,
        documentId: (form.get('document_id') as string | null) ?? null,
      });
      return HttpResponse.json(stripSource(source), { status: 201 });
    }),
    http.delete('/api/v1/projects/:projectId/sources/:sourceId', ({ request, params }) => {
      log(request);
      db.sources = db.sources.filter((s) => s.id !== params.sourceId);
      return new HttpResponse(null, { status: 204 });
    }),

    http.post(
      '/api/v1/projects/:projectId/documents/:documentId/analysis-jobs',
      async ({ request, params }) => {
        const body = (await request.json()) as { force?: boolean };
        log(request, body);
        const doc = db.documents.find((d) => d.id === params.documentId);
        if (!doc) return notFound();
        if (doc.status === 'ready' && !body.force) {
          return HttpResponse.json(
            { detail: { detail: 'Документ уже проверен', confirmation_required: true } },
            { status: 409 },
          );
        }
        const job = addJob(db, doc.id);
        doc.status = 'in_progress';
        doc.currentJobId = job.id;
        return HttpResponse.json(job, { status: 202 });
      },
    ),
    http.get(
      '/api/v1/projects/:projectId/documents/:documentId/analysis-jobs/:jobId',
      ({ request, params }) => {
        log(request);
        const job = db.jobs.find((j) => j.id === params.jobId);
        return job ? HttpResponse.json(job) : notFound();
      },
    ),
    http.delete(
      '/api/v1/projects/:projectId/documents/:documentId/analysis-jobs/:jobId',
      ({ request, params }) => {
        log(request);
        const job = db.jobs.find((j) => j.id === params.jobId);
        const doc = db.documents.find((d) => d.id === params.documentId);
        if (!job || !doc) return notFound();
        const cancellable = ['pending', 'dispatched', 'processing', 'cancelled'];
        if (!cancellable.includes(job.status)) {
          return HttpResponse.json(
            { detail: 'Завершённую задачу анализа отменить нельзя' },
            { status: 409 },
          );
        }
        job.status = 'cancelled';
        job.error_code = 'ANALYSIS_CANCELLED';
        job.error_message = 'Анализ отменён';
        doc.status = 'draft';
        return HttpResponse.json(job);
      },
    ),
    http.post('/api/v1/projects/:projectId/documents/:documentId/open', ({ request, params }) => {
      log(request);
      const doc = db.documents.find((d) => d.id === params.documentId);
      if (!doc) return notFound();
      doc.lastOpenedAt = new Date().toISOString();
      return new HttpResponse(null, { status: 204 });
    }),
    http.get('/api/v1/dashboard', ({ request }) => {
      log(request);
      const total = db.documents.length;
      const awaiting = db.documents.filter((d) => d.status === 'awaiting_approval').length;
      const ready = db.documents.filter((d) => d.status === 'ready').length;
      const relevance = total === 0 ? 0 : (ready / total) * 100;
      const week = (value: number) =>
        Array.from({ length: 7 }, (_, i) => ({ date: `2026-09-${String(24 + i)}`, value }));
      return HttpResponse.json({
        total_documents: total,
        awaiting_approval_count: awaiting,
        ready_count: ready,
        relevance_percent: relevance,
        total_trend: week(total),
        awaiting_trend: week(awaiting),
        relevance_trend: week(relevance),
      });
    }),
    http.get('/api/v1/documents/attention', ({ request }) => {
      log(request);
      return HttpResponse.json(
        db.documents
          .filter((d) => d.status === 'awaiting_approval')
          .sort((a, b) => b.suggestions.pending - a.suggestions.pending)
          .slice(0, 4)
          .map((d) => ({
            id: d.id,
            title: d.name,
            project_id: d.projectId,
            project_name: db.projects.find((p) => p.id === d.projectId)?.name ?? '',
            pending_suggestions: d.suggestions.pending,
            updated_at: d.uploadedAt,
          })),
      );
    }),
    http.get('/api/v1/documents/recent', ({ request }) => {
      log(request);
      return HttpResponse.json(
        db.documents
          .filter((d): d is DbDocument & { lastOpenedAt: string } => d.lastOpenedAt !== null)
          .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
          .slice(0, 5)
          .map((d) => ({
            id: d.id,
            title: d.name,
            project_id: d.projectId,
            project_name: db.projects.find((p) => p.id === d.projectId)?.name ?? '',
            status: d.status,
            uploaded_at: d.uploadedAt,
            last_opened_at: d.lastOpenedAt,
            suggestions_total: d.suggestions.total,
            suggestions_resolved: d.suggestions.accepted + d.suggestions.rejected,
          })),
      );
    }),
    http.post('/api/v1/projects/:projectId/documents/analysis-jobs/bulk', async ({ request }) => {
      const body = (await request.json()) as { document_ids: string[]; force: boolean };
      log(request, body);
      const results = body.document_ids.map((documentId) => {
        const doc = db.documents.find((d) => d.id === documentId);
        if (!doc) return { document_id: documentId, job: null, skip_reason: 'not_found' as const };
        if (doc.status === 'ready' && !body.force) {
          return {
            document_id: documentId,
            job: null,
            skip_reason: 'confirmation_required' as const,
          };
        }
        const job = addJob(db, doc.id);
        doc.status = 'in_progress';
        doc.currentJobId = job.id;
        return { document_id: documentId, job, skip_reason: null };
      });
      return HttpResponse.json({
        started: results.filter((r) => r.job).length,
        skipped: results.filter((r) => !r.job).length,
        confirmation_required: results.filter((r) => r.skip_reason === 'confirmation_required')
          .length,
        results,
      });
    }),
  ];
}
