import { client, multipartBody, ok } from '../client';
import type { MyDocumentsParams } from '../queryKeys';
import type { DocumentListPage, DocumentResponse, PageParams, Schemas } from '../types';

export async function listMyDocuments(params: MyDocumentsParams = {}): Promise<DocumentListPage> {
  const { status, search, ...rest } = params;
  return ok(
    await client.GET('/api/v1/documents', {
      params: {
        query: {
          ...rest,
          status: status as Schemas['DocumentStatusVO'] | undefined,
          // пустую строку не отправляем: сервер воспринял бы её как фильтр
          search: search?.trim() ? search.trim() : undefined,
        },
      },
    }),
  );
}

/** Загрузка в проект; имя документа сервер берёт из file.name. */
export async function uploadProjectDocument(
  projectId: string,
  file: File,
): Promise<DocumentResponse> {
  return ok(
    await client.POST('/api/v1/projects/{project_id}/documents', {
      params: { path: { project_id: projectId } },
      ...multipartBody<Schemas['Body_upload_document_api_v1_projects__project_id__documents_post']>(
        {
          file,
        },
      ),
    }),
  );
}

/** Документы проекта. Ответ — DocumentResponse без бейджей источников и счётчиков правок. */
export async function listProjectDocuments(
  projectId: string,
  params: PageParams & { status?: string } = {},
): Promise<Schemas['Page_DocumentResponse_']> {
  return ok(
    await client.GET('/api/v1/projects/{project_id}/documents', {
      params: { path: { project_id: projectId }, query: params },
    }),
  );
}

export async function getDocument(
  projectId: string,
  documentId: string,
): Promise<DocumentResponse> {
  return ok(
    await client.GET('/api/v1/projects/{project_id}/documents/{document_id}', {
      params: { path: { project_id: projectId, document_id: documentId } },
    }),
  );
}

/** 409, если документ в in_progress. */
export async function deleteDocument(projectId: string, documentId: string): Promise<void> {
  ok(
    await client.DELETE('/api/v1/projects/{project_id}/documents/{document_id}', {
      params: { path: { project_id: projectId, document_id: documentId } },
    }),
  );
}
