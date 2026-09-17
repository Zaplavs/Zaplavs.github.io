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
const routes = ['/'];
const accessibility = [];
try {
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'Dark theme is the default');
  assert.equal(await page.locator('html').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(24, 24, 27)', 'Neutral graphite background');
  assert.equal(await page.locator('.project-open').count(), 0, 'No white circles over project previews');
  assert.deepEqual(await page.locator('.project-title-arrow').allTextContents(), ['↗'], 'Стрелка только у приглашающей карточки');
  await page.getByRole('button', { name: 'Включить светлую тему' }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light', 'Theme survives reload');
  await page.getByRole('button', { name: 'Включить тёмную тему' }).click();
  await page.reload();
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
  await page.locator('#mobile-nav').getByRole('link', { name: 'Работы' }).click();
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
  // Интерактивный слой: калькулятор, слайдер сравнения, палитра команд, акцент.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);

  // Бегущая строка не должна разрываться: ход анимации >= ширины экрана.
  for (const width of [2560, 1440, 800, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.marquee-row')].map(row => {
      const unit = row.firstElementChild.getBoundingClientRect().width;
      return { travel: unit * row.children.length / 2, viewport: innerWidth, even: row.children.length % 2 === 0 };
    }));
    assert.equal(rows.length, 2, 'Обе строки на месте');
    for (const row of rows) {
      assert.ok(row.travel >= row.viewport - 1, `Бегущая строка без разрыва на ${width}px`);
      assert.ok(row.even, `Чётное число копий на ${width}px`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();

  // Работы: шесть карточек, пять с реальными превью.
  assert.equal(await page.locator('.work-card').count(), 6, 'Пять работ и приглашающая карточка');
  assert.equal(await page.locator('.work-frame img').count(), 5, 'У каждой работы есть превью');
  const alts = await page.locator('.work-frame img').evaluateAll(list => list.map(i => i.alt));
  assert.ok(alts.every(a => a && a.length > 10), 'У превью осмысленное описание');

  // Вкладки «было / стало»: ровно одна панель открыта, стрелки переключают.
  const tabs = page.locator('.compare-tab');
  assert.equal(await tabs.count(), 3, 'Три примера редизайна');
  for (const key of ['dental', 'garage', 'build']) {
    await page.locator(`#tab-${key}`).click();
    assert.equal(await page.locator('.compare-panel:not([hidden])').count(), 1, 'Открыта одна панель');
    assert.equal(await page.locator('.compare-panel:not([hidden])').getAttribute('id'), `panel-${key}`);
  }
  await page.locator('#tab-build').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-dental', 'Стрелки переключают вкладки');
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'tab-build');

  // Цена названа прямо и согласована между секциями.
  assert.ok((await page.locator('.price-figure').textContent()).replace(/\s/g, '').includes('3000₽'), 'Стартовая цена видна');
  assert.equal(await page.locator('#price').count(), 1, 'Секция стоимости на месте');
  assert.equal(await page.locator('#estimate, #estimate-form').count(), 0, 'Калькулятора больше нет');
  for (const text of [await page.locator('.price-note span').textContent(),
                      await page.locator('.faq-list details p').first().textContent()]) {
    assert.ok(text.includes('3 000'), 'Цена одинаковая в услугах, FAQ и блоке стоимости');
  }

  const slider = page.locator('.compare-panel:not([hidden]) .compare-range');
  await slider.focus();
  const before = await slider.inputValue();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  assert.notEqual(await slider.inputValue(), before, 'Слайдер «было/стало» слушает клавиатуру');
  assert.ok((await page.locator('.compare-panel:not([hidden]) .compare-stage').getAttribute('style')).includes('--split'), 'Разделитель двигается');

  const palette = page.locator('#palette');
  await page.keyboard.press('Control+k');
  assert.ok(await palette.evaluate(node => node.open), 'Палитра открывается по Ctrl+K');
  await page.locator('#palette-input').fill('стоим');
  assert.equal(await page.locator('.palette-list button').count(), 1, 'Палитра фильтрует команды');
  await page.keyboard.press('Escape');
  assert.equal(await palette.evaluate(node => node.open), false, 'Палитра закрывается по Escape');
  await page.locator('.palette-hint').click();
  assert.ok(await palette.evaluate(node => node.open), 'Палитра открывается кнопкой в подвале');
  await page.keyboard.press('Escape');

  await page.locator('.accent-swatch[data-accent="coral"]').click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.accent), 'coral');
  await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.accent), 'coral', 'Акцент переживает перезагрузку');
  await page.locator('.accent-swatch[data-accent="lime"]').click();

  await page.evaluate(() => sessionStorage.clear());
  await page.goto(base);
  await page.waitForSelector('.preloader', { state: 'detached', timeout: 15000 });
  console.log('Verified interactive layer: works grid, compare tabs and slider, price block, command palette, accent, marquee.');

  await fs.writeFile('test-results/accessibility.json', JSON.stringify(accessibility, null, 2));
  assert.deepEqual(errors, [], 'No browser errors or missing assets');
  const violations = accessibility.flatMap(item => item.violations.map(v => `${item.route} ${item.theme}: ${v.id} (${v.nodes.length} elements)`));
  console.log(violations.length ? 'Accessibility findings:\n' + violations.join('\n') : 'Accessibility checks passed.');
  assert.deepEqual(violations, [], 'WCAG A/AA accessibility checks');
  console.log('All checks passed: pages, 4 viewport sizes, themes, persistence, photo, navigation, FAQ, links, accessibility, interactive layer.');
} finally {
  await browser.close();
}
