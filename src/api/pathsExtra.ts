/**
 * Пути, добавленные в SyncBack после последней генерации openapi.d.ts
 * (SyncBack#72 — файл документа, SyncBack#86 — скачивание и просмотр источников).
 * Форма повторяет вывод openapi-typescript. После `npm run api:types` на обновлённом
 * бэкенде этот файл станет лишним и его нужно удалить вместе с пересечением в client.ts.
 */

interface ErrorBody {
  detail: string;
}

/** Ответ GET /sources/{id}/download: presigned-ссылка на файл или адрес url-источника. */
export interface SourceDownloadResponseExtra {
  download_url: string;
  /** Срок жизни ссылки в секундах; null для url-источника — это его постоянный адрес. */
  expires_in: number | null;
}

/** Ответ GET /sources/{id}/content: текст файла или причина, почему просмотра нет. */
export interface SourceContentResponseExtra {
  id: string;
  name: string;
  type: 'url' | 'file';
  url: string | null;
  created_at: string;
  plain_text: string | null;
  preview_available: boolean;
  reason: string | null;
}

export interface ExtraPaths {
  '/api/v1/projects/{project_id}/documents/{document_id}/file': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Исходный файл документа для просмотра в браузере (байты, Content-Disposition: inline). */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          project_id: string;
          document_id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: Record<string, unknown>;
          content: {
            'application/octet-stream': string;
          };
        };
        404: {
          headers: Record<string, unknown>;
          content: {
            'application/json': ErrorBody;
          };
        };
        502: {
          headers: Record<string, unknown>;
          content: {
            'application/json': ErrorBody;
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/projects/{project_id}/sources/{source_id}/download': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Ссылка на скачивание источника: presigned URL для файла, адрес для url-источника. */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          project_id: string;
          source_id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: Record<string, unknown>;
          content: {
            'application/json': SourceDownloadResponseExtra;
          };
        };
        404: {
          headers: Record<string, unknown>;
          content: {
            'application/json': ErrorBody;
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/api/v1/projects/{project_id}/sources/{source_id}/content': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Текст источника для просмотра без редактирования. */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          project_id: string;
          source_id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: Record<string, unknown>;
          content: {
            'application/json': SourceContentResponseExtra;
          };
        };
        404: {
          headers: Record<string, unknown>;
          content: {
            'application/json': ErrorBody;
          };
        };
        502: {
          headers: Record<string, unknown>;
          content: {
            'application/json': ErrorBody;
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
