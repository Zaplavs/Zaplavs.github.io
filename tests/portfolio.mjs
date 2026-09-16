import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.TEST_URL || 'http://127.0.0.1:4179';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
await fs.mkdir('test-results', { recursive: true });
const routes = ['/', '/projects/forma.html', '/projects/coffee.html', '/projects/beauty.html'];
const accessibility = [];
try {
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'Dark theme is the default');
  assert.equal(await page.locator('html').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(24, 24, 27)', 'Neutral graphite background');
  assert.equal(await page.locator('.project-open').count(), 0, 'No white circles over project previews');
  assert.deepEqual(await page.locator('.project-title-arrow').allTextContents(), ['↗', '↗', '↗']);
  await page.getByRole('button', { name: 'Включить светлую тему' }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light', 'Theme survives reload');
  await page.goto(base + routes[1]);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light', 'Theme survives page navigation');
  await page.getByRole('button', { name: 'Включить тёмную тему' }).click();
  await page.goto(base);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.locator('#profile-photo').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#profile-photo').naturalWidth > 0);
  assert.ok(await page.locator('#profile-photo').evaluate(image => image.complete && image.naturalWidth > 0), 'Profile photo loads');
  await page.locator('.faq-list summary').first().click();
  assert.equal(await page.locator('.faq-list details').first().getAttribute('open'), '');
  await page.locator('.faq-list summary').first().click();
  assert.equal(await page.locator('.faq-list details').first().getAttribute('open'), null);
  for (const route of routes) {
    for (const theme of ['dark', 'light']) {
      await page.evaluate(value => localStorage.setItem('az-theme', value), theme);
      await page.goto(base + route);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        assert.equal(overflow, false, `No horizontal overflow: ${route} ${theme} ${width}px`);
        if (width === 1440 || width === 390) {
          const name = route === '/' ? 'home' : route.split('/').pop().replace('.html', '');
          await page.screenshot({ path: `test-results/${name}-${theme}-${width}.png`, fullPage: true });
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator('.faq-list details').evaluateAll(items => items.forEach(item => { item.open = true; }));
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      accessibility.push({ route, theme, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
      const images = await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).map(image => image.src));
      assert.deepEqual(images, [], `Images load: ${route}`);
      console.log(`Verified ${route} / ${theme}`);
    }
  }
  await page.goto(base);
  await page.setViewportSize({ width: 390, height: 844 });
  const menu = page.getByRole('button', { name: 'Открыть меню' });
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  await page.locator('#mobile-nav').getByRole('link', { name: 'Проекты' }).click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  assert.ok(page.url().endsWith('#work'));
  await menu.click();
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  for (const route of routes) {
    await page.goto(base + route);
    const links = await page.locator('a').evaluateAll(links => links.map(a => a.getAttribute('href')));
    for (const link of links.filter(href => href?.startsWith('https:'))) {
      assert.equal(new URL(link).hostname, 't.me');
      assert.equal(new URL(link).pathname, '/evgeinif');
    }
    const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll(links => links.filter(a => a.hash && !document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a => a.hash));
    assert.deepEqual(brokenAnchors, [], `Anchor targets exist: ${route}`);
  }
  await fs.writeFile('test-results/accessibility.json', JSON.stringify(accessibility, null, 2));
  assert.deepEqual(errors, [], 'No browser errors or missing assets');
  const violations = accessibility.flatMap(item => item.violations.map(v => `${item.route} ${item.theme}: ${v.id} (${v.nodes.length} elements)`));
  console.log(violations.length ? 'Accessibility findings:\n' + violations.join('\n') : 'Accessibility checks passed.');
  assert.deepEqual(violations, [], 'WCAG A/AA accessibility checks');
  console.log('All checks passed: pages, 4 viewport sizes, themes, persistence, photo, navigation, FAQ, links, accessibility.');
} finally {
  await browser.close();
}
