/**
 * Ключи TanStack Query. Иерархия позволяет инвалидировать срезами:
 * queryKeys.documents.all сбрасывает все списки и детали документов.
 */
import type { PageParams } from './types';

export interface MyDocumentsParams extends PageParams {
  status?: string;
  search?: string;
  outdated?: boolean;
  sort_by?: 'created_at' | 'updated_at' | 'name';
  sort_dir?: 'asc' | 'desc';
}

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  system: {
    capabilities: ['system', 'capabilities'] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (params: PageParams = {}) => ['projects', 'list', params] as const,
    detail: (projectId: string) => ['projects', 'detail', projectId] as const,
  },
  documents: {
    all: ['documents'] as const,
    my: (params: MyDocumentsParams = {}) => ['documents', 'my', params] as const,
    byProject: (projectId: string, params: PageParams & { status?: string } = {}) =>
      ['documents', 'project', projectId, params] as const,
    detail: (projectId: string, documentId: string) =>
      ['documents', 'detail', projectId, documentId] as const,
    content: (projectId: string, documentId: string) =>
      ['documents', 'content', projectId, documentId] as const,
    editor: (projectId: string, documentId: string) =>
      ['documents', 'editor', projectId, documentId] as const,
  },
  sources: {
    all: ['sources'] as const,
    byProject: (projectId: string, params: PageParams & { scope?: string } = {}) =>
      ['sources', 'project', projectId, params] as const,
  },
  analysisJobs: {
    detail: (projectId: string, documentId: string, jobId: string) =>
      ['analysis-jobs', projectId, documentId, jobId] as const,
  },
  suggestions: {
    list: (projectId: string, documentId: string, params: PageParams & { status?: string } = {}) =>
      ['suggestions', projectId, documentId, params] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: ['dashboard', 'summary'] as const,
    attention: ['dashboard', 'attention'] as const,
    recent: ['dashboard', 'recent'] as const,
  },
} as const;
