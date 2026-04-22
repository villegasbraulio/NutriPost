import { test, expect } from '@playwright/test';

test.beforeEach (async({page}) =>{

      await page.goto('http://localhost:5173/auth/login');

});

test.describe('Testeando', ()=>{

    test('deberia mostrar mensaje correcto', async ({ page }) => {

        await page.getByPlaceholder('demo').fill('prilimpino');
        await page.getByPlaceholder('••••••••').fill('adm');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
});

});

