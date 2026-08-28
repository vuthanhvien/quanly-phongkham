import { expect, type APIRequestContext, type Page } from '@playwright/test';

export type CmsRole = 'ADMIN' | 'STAFF' | 'DOCTOR' | 'STAFF_SALES' | 'STAFF_CS' | 'DOCTOR_LEAD';

export type RoleCredentials = { identifier: string; password: string };

const rolePrefix: Record<CmsRole, string> = {
  ADMIN: 'E2E_ADMIN',
  STAFF: 'E2E_STAFF',
  DOCTOR: 'E2E_DOCTOR',
  STAFF_SALES: 'E2E_STAFF_SALES',
  STAFF_CS: 'E2E_STAFF_CS',
  DOCTOR_LEAD: 'E2E_DOCTOR_LEAD',
};

/** Reads credentials only from the environment; never commit test passwords. */
export function credentialsFor(role: CmsRole): RoleCredentials | undefined {
  const prefix = rolePrefix[role];
  const identifier = process.env[`${prefix}_IDENTIFIER`];
  const password = process.env[`${prefix}_PASSWORD`];
  return identifier && password ? { identifier, password } : undefined;
}

export function requireCredentials(role: CmsRole): RoleCredentials {
  const credentials = credentialsFor(role);
  if (!credentials) {
    throw new Error(`Missing ${rolePrefix[role]}_IDENTIFIER and ${rolePrefix[role]}_PASSWORD`);
  }
  return credentials;
}

export async function login(page: Page, role: CmsRole) {
  const credentials = requireCredentials(role);
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập').fill(credentials.identifier);
  await page.getByLabel('Mật khẩu').fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

export async function apiLogin(request: APIRequestContext, role: CmsRole) {
  const credentials = requireCredentials(role);
  const response = await request.post('/api/auth/login', { data: credentials });
  expect(response, `login for ${role}`).toBeOK();
  return (await response.json()) as { accessToken: string; user: { role: string; activeRole?: string; roleMain?: string } };
}
