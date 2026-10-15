import { client, ok } from '../client';

import { parseContentDispositionFilename, type ExportedFile } from './editor';

/** Исходный файл через авторизованный API; браузер не обращается к S3-хосту. */
export async function getSourceFile(
  projectId: string,
  sourceId: string,
  fallbackName: string,
): Promise<ExportedFile> {
  const result = await client.GET('/api/v1/projects/{project_id}/sources/{source_id}/file', {
    params: { path: { project_id: projectId, source_id: sourceId } },
    parseAs: 'blob',
  });
  const blob = ok<Blob>(result);
  const filename =
    parseContentDispositionFilename(result.response.headers.get('Content-Disposition')) ??
    fallbackName;
  return { blob, filename };
}
