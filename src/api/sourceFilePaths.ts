/** Временный контракт SyncBack#87 до перегенерации openapi.d.ts. */
export interface SourceFilePaths {
  '/api/v1/projects/{project_id}/sources/{source_id}/file': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: { project_id: string; source_id: string };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: Record<string, unknown>;
          content: { 'application/octet-stream': string };
        };
        404: FileErrorResponse;
        422: FileErrorResponse;
        502: FileErrorResponse;
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

interface FileErrorResponse {
  headers: Record<string, unknown>;
  content: { 'application/json': { detail: string } };
}
