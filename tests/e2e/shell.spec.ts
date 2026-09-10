import {expect, test} from '@playwright/test';

test('SSR response preserves public allowlist and never serializes server secrets', async ({request}) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('Grounded in proof.');
  expect(html).toContain('fixture');
  expect(html).not.toContain('PC01_SERVER_SECRET_MARKER');
  expect(html).not.toContain('PC01_VITE_SECRET_MARKER');
  expect(html).not.toContain('PRIVATE_STOREFRONT_API_TOKEN');
  const csp = response.headers()['content-security-policy'];
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("connect-src 'self';");
  expect(csp).toContain("style-src 'self';");
  expect(csp).not.toMatch(/https?:|wss?:|unsafe-inline|shopify|monorail/);
  expect(response.headers()['cache-control']).toBe('no-store');
});

test('production page hydrates without browser errors or third-party requests', async ({page, context}) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  const downloadedBodies: Promise<string>[] = [];
  const documentRequests: string[] = [];
  page.on('request', (request) => {if (request.resourceType() === 'document') documentRequests.push(request.url());});
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {if (message.type() === 'error') errors.push(message.text());});
  page.on('response', (response) => {downloadedBodies.push(response.text().catch(() => ''));});
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:4173') {
      externalRequests.push(route.request().url());
      await route.abort();
    } else await route.continue();
  });
  await page.goto('/?preview=hydration');
  await expect(page).toHaveTitle('Proof Cart — A considered way to shop');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Good choices.Grounded in proof.');
  await page.waitForLoadState('networkidle');
  // SPA navigation succeeds with no second document load only after hydration.
  await page.getByRole('link', {name: 'Proof Cart home'}).click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await page.waitForLoadState('networkidle');
  expect(documentRequests).toHaveLength(1);
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
  const browserPayloads = (await Promise.all(downloadedBodies)).join('\n');
  expect(browserPayloads).not.toContain('PC01_SERVER_SECRET_MARKER');
  expect(browserPayloads).not.toContain('PC01_VITE_SECRET_MARKER');
  expect(await page.evaluate(() => ({local: {...localStorage}, session: {...sessionStorage}}))).toEqual({local: {}, session: {}});
});

test('direct unknown route returns 404 and the recovery link works', async ({page}) => {
  const response = await page.goto('/a-page-that-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', {level: 1})).toHaveText('This page isn’t here.');
  await page.getByRole('link', {name: /Return to preview/}).click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Good choices.Grounded in proof.');
});

test('keyboard flow reaches main content and catalog search', async ({page}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name: 'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name: /Explore the catalog/})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('http://127.0.0.1:4173/catalog');
  await expect(page.getByRole('heading', {name: 'Find your next good choice.'})).toBeInViewport();
});

test('phone layout stays within the viewport', async ({page}) => {
  await page.setViewportSize({width: 360, height: 800});
  await page.goto('/');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('HEAD preserves status and every unsupported write is rejected', async ({request}) => {
  const head = await request.head('/');
  expect(head.status()).toBe(200);
  expect(await head.text()).toBe('');
  expect((await request.head('/missing')).status()).toBe(404);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    for (const path of ['/', '/missing']) {
      const response = await request.fetch(path, {method, data: 'untrusted=PC01_SERVER_SECRET_MARKER'});
      expect(response.status(), `${method} ${path} must be rejected by the read-only boundary`).toBe(405);
      expect(response.headers().allow).toBe('GET, HEAD');
      expect(await response.text()).toBe('This preview is read-only.');
    }
  }
});
