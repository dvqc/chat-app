import { test, expect } from '#tests/playwright-utils';

test('Users can create and edit channels', async ({ page, login }) => {
    await login()

    await page.goto('/channels');

    const newChannelName = 'new channel'
    await page.locator('div').filter({ hasText: /^Channels$/ }).getByRole('button').click();
    await page.getByLabel('Name').fill(newChannelName);
    await page.getByLabel('Description').click();
    await page.getByLabel('Description').fill('description');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('a').getByText(newChannelName)).toBeVisible()

    await page.getByRole('link', { name: newChannelName }).click();
    const editedChannelName = `edited channel`
    await page.getByRole('button').first().click();
    await page.getByLabel('Name').fill(editedChannelName);
    await page.getByLabel('Description').click();
    await page.getByLabel('Description').fill('edited description');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('complementary').getByRole('heading', { name: editedChannelName })).toBeVisible();
});

test('Users can send messages in channels', async ({ page, login, insertNewChannel }) => {
    const user = await login()
    const channel = await insertNewChannel({ ownerId: user.id })

    await page.goto('/channels');
    await page.getByRole('link', { name: channel.name }).click();
    await page.getByRole('textbox').click();
    await page.getByRole('textbox').fill('hey there');
    await page.locator('button[name="intent"]').click();

    await expect(page.locator('div').getByText('hey there')).toBeVisible();
});
