/**
 * Пути, добавленные в SyncBack после последней генерации openapi.d.ts (SyncBack#72).
 * Форма повторяет вывод openapi-typescript. После `npm run api:types` на обновлённом
 * бэкенде этот файл станет лишним и его нужно удалить вместе с пересечением в client.ts.
 */

interface ErrorBody {
  detail: string;
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
}
