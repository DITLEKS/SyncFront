import { client, ok } from '../client';
import type {
  PageParams,
  ProjectCreateRequest,
  ProjectPage,
  ProjectResponse,
  ProjectUpdateRequest,
} from '../types';

export async function listProjects(params: PageParams = {}): Promise<ProjectPage> {
  return ok(await client.GET('/api/v1/projects', { params: { query: params } }));
}

export type ProjectInclude = 'documents' | 'sources';

export async function getProject(
  projectId: string,
  include: ProjectInclude[] = [],
): Promise<ProjectResponse> {
  return ok(
    await client.GET('/api/v1/projects/{project_id}', {
      params: { path: { project_id: projectId }, query: { include } },
    }),
  );
}

export async function createProject(body: ProjectCreateRequest): Promise<ProjectResponse> {
  return ok(await client.POST('/api/v1/projects', { body }));
}

export async function updateProject(
  projectId: string,
  body: ProjectUpdateRequest,
): Promise<ProjectResponse> {
  return ok(
    await client.PATCH('/api/v1/projects/{project_id}', {
      params: { path: { project_id: projectId } },
      body,
    }),
  );
}

export async function deleteProject(projectId: string): Promise<void> {
  ok(
    await client.DELETE('/api/v1/projects/{project_id}', {
      params: { path: { project_id: projectId } },
    }),
  );
}
