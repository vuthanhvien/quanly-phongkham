import { expect, test } from '@playwright/test';
import { apiLogin, credentialsFor, login } from './fixtures/auth';
import { roleMatrix } from './role-matrix';

for (const contract of roleMatrix) {
  test.describe(`${contract.role} access contract`, () => {
    test.skip(!credentialsFor(contract.role), `Set E2E_${contract.role}_IDENTIFIER and E2E_${contract.role}_PASSWORD to enable this role.`);

    test('JWT contains the expected main role', async ({ request }) => {
      const session = await apiLogin(request, contract.role);
      expect(session.user.roleMain || session.user.role).toBe(contract.roleMain);
    });

    for (const path of contract.visiblePaths) {
      test(`can open ${path}`, async ({ page }) => {
        await login(page, contract.role);
        await page.goto(path);
        await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}(?:\\?|$)`));
      });
    }

    for (const path of contract.restrictedPaths) {
      test(`is redirected away from ${path}`, async ({ page }) => {
        await login(page, contract.role);
        await page.goto(path);
        await expect(page).not.toHaveURL(new RegExp(`${path.replace('/', '\\/')}(?:\\?|$)`));
      });
    }
  });
}
