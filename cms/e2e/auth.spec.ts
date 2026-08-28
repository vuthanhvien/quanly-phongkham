import { expect, test } from '@playwright/test';
import { login } from './fixtures/auth';

test.describe('Authentication', () => {
  test('rejects an invalid password', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Tên đăng nhập').fill('not-a-real-e2e-user');
    await page.getByLabel('Mật khẩu').fill('incorrect-password');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByText('Thông tin đăng nhập hoặc mật khẩu không đúng')).toBeVisible();
  });

  test('ADMIN can sign in and reach the dashboard', async ({ page }) => {
    await login(page, 'ADMIN');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });
});
