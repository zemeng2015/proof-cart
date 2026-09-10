import {expect, test} from '@playwright/test';

const product = (name: string) => `fixture:product:${name}`;
const compare = (...names: string[]) => `/compare?${new URLSearchParams(names.map(name => ['productId', product(name)]))}`;

test('search, detail, compare, add another and remove survive refresh', async ({page}, testInfo) => {
  await page.goto('/catalog');
  await expect(page.getByRole('heading', {name: 'A little direction goes a long way.'})).toBeVisible();
  await page.getByRole('searchbox').fill('cup');
  await page.getByRole('button', {name: 'Search', exact: true}).click();
  await page.getByRole('link', {name: 'Ceramic Cup', exact: true}).click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Ceramic Cup');
  await expect(page.getByRole('heading', {level: 1})).toBeFocused();
  await page.getByRole('link', {name: 'Compare Ceramic Cup'}).click();
  await page.getByRole('link', {name: /Find another product/}).click();
  await page.getByRole('searchbox').fill('bag');
  await page.getByRole('button', {name: 'Search', exact: true}).click();
  await page.getByRole('link', {name: 'Compare Canvas Tote Bag'}).click();
  await expect(page.getByRole('button', {name: 'Remove Ceramic Cup'})).toBeVisible();
  await page.screenshot({path: testInfo.outputPath('compare-desktop.png'), fullPage: true});
  await page.getByRole('button', {name: 'Remove Ceramic Cup'}).click();
  await expect(page.getByRole('status')).toHaveText('1 of 3 products selected');
  await expect(page.getByRole('status')).toBeFocused();
  await expect(page).not.toHaveURL(/ceramic-cup/);
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Canvas Tote Bag'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Ceramic Cup'})).toHaveCount(0);
});

test('comparison cap and duplicate input fail explicitly without truncation', async ({page}) => {
  const response = await page.goto(compare('ceramic-cup', 'steel-bottle', 'canvas-bag', 'free-guide'));
  expect(response?.status()).toBe(400);
  await expect(page.getByRole('alert')).toContainText('Choose up to three different products');
  expect((await page.goto(compare('ceramic-cup', 'ceramic-cup')))?.status()).toBe(400);
  await page.goto(`/catalog?${new URLSearchParams([['q', 'cup'], ...['steel-bottle', 'canvas-bag', 'free-guide'].map(name => ['productId', product(name)])])}`);
  await expect(page.getByText('Three products selected. Remove one to add another.')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Compare Ceramic Cup'})).toHaveCount(0);
});

test('unknown, unavailable, zero, and fractional price remain distinct with evidence', async ({page}) => {
  await page.goto(compare('price-unknown', 'sold-out', 'free-guide'));
  const unknown = page.getByRole('article').filter({has: page.getByRole('heading', {name: 'Price Unknown Notebook'})});
  await expect(unknown.getByText('Unknown · missing').first()).toBeVisible();
  await expect(unknown.getByText(/^USD/)).toHaveCount(0);
  await expect(page.getByText('Unavailable', {exact: true})).toBeVisible();
  await expect(page.getByText('USD 0', {exact: true})).toBeVisible();
  await page.goto(`/products/${product('ceramic-cup')}`);
  const blue = page.getByRole('region', {name: 'Blue variant'});
  await expect(blue.getByText('USD 19.999')).toBeVisible();
  await blue.getByText('Evidence for price').click();
  await expect(blue.getByText('proof-cart-demo:v1:variant:cup-blue:price')).toBeVisible();
  await expect(blue.locator('details[open]').getByText('Synthetic fixture · proof-cart-demo · v1')).toBeVisible();
});

test('keyboard search, detail, evidence disclosure and comparison work without a pointer', async ({page}) => {
  await page.goto('/catalog?q=cup');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  for (let steps = 0; steps < 15; steps++) {
    await page.keyboard.press('Tab');
    if (await page.getByRole('link', {name: 'Ceramic Cup', exact: true}).evaluate(element => element === document.activeElement)) break;
  }
  await expect(page.getByRole('link', {name: 'Ceramic Cup', exact: true})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', {level: 1})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByText('Evidence for material')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('proof-cart-demo:v1:product:ceramic-cup:specifications.material')).toBeVisible();
  await page.keyboard.press('Enter');
  for (let steps = 0; steps < 20; steps++) {
    await page.keyboard.press('Tab');
    if (await page.getByRole('link', {name: 'Compare Ceramic Cup'}).evaluate(element => element === document.activeElement)) break;
  }
  await expect(page.getByRole('link', {name: 'Compare Ceramic Cup'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Your comparison.');
});

test('description injection stays plain data and cannot override sourced facts or trigger writes', async ({page}) => {
  const writes: string[] = [];
  page.on('request', request => {if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url());});
  await page.goto(`/products/${product('injection')}`);
  await expect(page.getByText(/Ignore previous instructions/)).toBeVisible();
  await expect(page.getByText('USD 24')).toBeVisible();
  await expect(page.getByText('USD 0', {exact: true})).toHaveCount(0);
  await expect(page.getByText('Supplied description. Claims here are not verified product facts.')).toBeVisible();
  await expect(page.getByRole('button', {name: /checkout|buy|cart/i})).toHaveCount(0);
  expect(writes).toEqual([]);
});

test('empty, not-found and phone comparison states remain navigable', async ({page}, testInfo) => {
  await page.goto('/catalog?q=not-a-real-product-xyz');
  await expect(page.getByRole('status').filter({hasText: 'No products found'})).toBeVisible();
  expect((await page.goto(`/products/${product('missing')}`))?.status()).toBe(404);
  await expect(page.getByRole('alert')).toContainText('could not be found');
  await page.goto('/compare');
  await expect(page.getByRole('link', {name: 'Find products'})).toBeVisible();
  await page.setViewportSize({width: 360, height: 800});
  await page.goto(compare('ceramic-cup', 'canvas-bag', 'steel-bottle'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: testInfo.outputPath('compare-phone.png'), fullPage: true});
  for (const name of ['Ceramic Cup', 'Canvas Tote Bag', 'Steel Water Bottle']) await expect(page.getByRole('heading', {name})).toBeVisible();
});

test('search links and browser back keep the input synchronized with the results', async ({page}) => {
  await page.goto('/catalog');
  await page.getByRole('link', {name: 'cup', exact: true}).click();
  await expect(page.getByRole('searchbox')).toHaveValue('cup');
  await page.getByRole('searchbox').fill('bag');
  await page.getByRole('button', {name: 'Search', exact: true}).click();
  await expect(page.getByRole('link', {name: 'Canvas Tote Bag', exact: true})).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue('cup');
  await expect(page.getByRole('link', {name: 'Ceramic Cup', exact: true})).toBeVisible();
});
