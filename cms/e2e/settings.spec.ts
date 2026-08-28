import { expect, test } from '@playwright/test';
import { apiJson, sessionFor } from './fixtures/api';
import { credentialsFor } from './fixtures/auth';

test.describe('CMS configuration access', () => {
  test.skip(!credentialsFor('ADMIN'), 'Set E2E_ADMIN_IDENTIFIER and E2E_ADMIN_PASSWORD.');

  test('ADMIN can read dynamic roles and role assignments', async ({ request }) => {
    const admin = await sessionFor(request, 'ADMIN');
    const headers = { Authorization: `Bearer ${admin.token}` };
    const roles = await apiJson<{ data: Array<{ key: string }> }>(
      await request.get('/api/settings/dynamic-roles', { headers }),
      'list dynamic roles',
    );
    const assignments = await apiJson<{ data: unknown[] }>(
      await request.get('/api/settings/branch-role-assignments', { headers }),
      'list branch role assignments',
    );
    expect(Array.isArray(roles.data)).toBe(true);
    expect(Array.isArray(assignments.data)).toBe(true);
  });

  for (const role of ['STAFF', 'DOCTOR', 'STAFF_SALES', 'STAFF_CS', 'DOCTOR_LEAD'] as const) {
    test(`${role} is denied dynamic-role configuration through the API`, async ({ request }) => {
      test.skip(!credentialsFor(role), `Set E2E_${role}_IDENTIFIER and E2E_${role}_PASSWORD.`);
      const user = await sessionFor(request, role);
      const response = await request.get('/api/settings/dynamic-roles', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status()).toBe(403);
    });
  }
});
