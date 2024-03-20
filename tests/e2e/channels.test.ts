import { test, expect } from '#tests/playwright-utils';

test('Users can create channels', async ({ page, login }) => {
  await login()

  await page.goto('/channels');

  const newChannelName= 'new channel'
  await page.locator('div').filter({ hasText: /^Channels$/ }).getByRole('button').click();
  await page.getByLabel('Name').fill(newChannelName);
  await page.getByLabel('Description').click();
  await page.getByLabel('Description').fill('description');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('a').getByText(newChannelName)).toBeVisible()
});
