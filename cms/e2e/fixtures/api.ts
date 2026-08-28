import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { apiLogin, type CmsRole } from './auth';

export type E2eRecord = { id: string; [key: string]: unknown };

export type ApiSession = {
  request: APIRequestContext;
  token: string;
  user: { role: string; activeRole?: string; roleMain?: string; branchId?: string };
};

export async function sessionFor(request: APIRequestContext, role: CmsRole): Promise<ApiSession> {
  const login = await apiLogin(request, role);
  return { request, token: login.accessToken, user: login.user };
}

export function authHeaders(session: ApiSession) {
  return { Authorization: `Bearer ${session.token}` };
}

export async function apiJson<T>(response: APIResponse, message: string): Promise<T> {
  expect(response, message).toBeOK();
  return await response.json() as T;
}

export async function createRecord(session: ApiSession, resource: string, payload: Record<string, unknown>) {
  const response = await session.request.post(`/api/records/${resource}`, { data: payload, headers: authHeaders(session) });
  const body = await apiJson<{ data: E2eRecord }>(response, `create ${resource}`);
  return body.data;
}

export async function listRecords(session: ApiSession, resource: string, params: Record<string, string | number> = {}) {
  const response = await session.request.get(`/api/records/${resource}`, {
    params: { page: 1, pageSize: 100, ...params },
    headers: authHeaders(session),
  });
  const body = await apiJson<{ data: E2eRecord[] }>(response, `list ${resource}`);
  return body.data;
}

export async function archiveRecord(session: ApiSession, resource: string, id: string) {
  const response = await session.request.delete(`/api/records/${resource}/${id}`, { headers: authHeaders(session) });
  expect(response, `archive ${resource}/${id}`).toBeOK();
}

export function e2eId(prefix: string) {
  return `E2E-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

export async function defaultBranchId(session: ApiSession) {
  if (session.user.branchId) return session.user.branchId;
  const branches = await listRecords(session, 'branches');
  const branch = branches[0];
  if (!branch?.id) throw new Error('E2E tenant needs at least one active branch.');
  return branch.id;
}
