import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Standalone production-compatible UI acceptance. No /src import, no product globals.
const base = process.env.GAME_URL || 'http://localhost:5180';
const out = fileURLToPath(new URL('../artifacts/', import.meta.url));
const key = 'puzzle-sudoku-character-v1';
const gameKey = 'puzzle-sudoku-v1';
const characters = [
  ['classic', 'Joke Bear'], ['chiikawa', '吉伊'], ['hachiware', '小八'], ['usagi', '乌萨奇'],
  ['mole-croquette', '鼹鼠饼'], ['old-dog', '老头狗'], ['bear-raincoat', '小黄鸭雨衣熊'],
  ['bear-pajama', '睡衣派对熊'], ['bear-ninja', '夜行忍者熊'], ['kurimanju', '栗子馒头'],
  ['momonga', '飞鼠'], ['rakko', '海獭'], ['shisa', '狮萨'], ['furuhonya', '古本屋'],
  ['bear-strawberry', '草莓熊'], ['bear-frog', '青蛙熊'], ['bear-astronaut', '太空熊'],
  ['bear-chef', '厨师熊'], ['bear-pirate', '海盗熊'],
];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const contexts = [], errors = [], checks = [];
const check = (name, ok) => { assert.ok(ok, name); checks.push(name); console.log('PASS', name); };
const picker = page => page.locator('#character-picker');
const summary = page => page.locator('#character-summary');
const option = (page, id) => page.locator(`[data-character="${id}"]`);
const current = page => page.locator('#companion-name').textContent();
const readGame = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).current, gameKey);
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
async function setup({ viewport = { width: 1440, height: 900 }, touch = false, raw = null, mode = '' } = {}) {
  const context = await browser.newContext({ viewport, isMobile: touch, hasTouch: touch, reducedMotion: 'reduce' });
  contexts.push(context);
  await context.addInitScript(({ key, raw, mode }) => {
    if (mode === 'blocked') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    else if (mode === 'quota') {
      Storage.prototype.setItem = function () { throw new DOMException('Storage full', 'QuotaExceededError'); };
    } else if (!sessionStorage.getItem('character-fixture')) {
      if (raw === null) localStorage.removeItem(key); else localStorage.setItem(key, raw);
      sessionStorage.setItem('character-fixture', '1');
    }
  }, { key, raw, mode });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(`pageerror ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#companion-image').waitFor();
  await page.waitForFunction(() => { const img = document.querySelector('#companion-image'); return img.complete && img.naturalWidth > 0; });
  return page;
}
async function assertAllImages(page) {
  await page.locator('.character-grid img').evaluateAll(images => Promise.all(images.map(image => {
    image.loading = 'eager';
    return image.decode();
  })));
  const images = await page.locator('.character-grid img').evaluateAll(nodes => nodes.map(img => ({ src: img.src, loaded: img.complete && img.naturalWidth > 0, alt: img.alt })));
  check('all nineteen local WebP portraits load with meaningful alt text', images.length === 19 && images.every(image => image.loaded && image.alt.endsWith('头像') && new URL(image.src).pathname.includes('/characters-2d/')));
}
try {
  await mkdir(out, { recursive: true });
  const desktop = await setup();
  check('default companion visible with name, disclosure closed, existing Sudoku grid intact', await current(desktop) === 'Joke Bear' && !await picker(desktop).evaluate(el => el.open) && await desktop.locator('.cell').count() === 81);
  await desktop.screenshot({ path: `${out}/characters-desktop.png`, fullPage: true, animations: 'disabled' });
  await summary(desktop).focus();
  check('summary has an explicit visible keyboard focus ring', await summary(desktop).evaluate(el => getComputedStyle(el).outlineStyle !== 'none'));
  await desktop.keyboard.press('Enter');
  check('keyboard Enter opens native character disclosure', await picker(desktop).evaluate(el => el.open));
  check('nineteen named buttons and only one aria-pressed selection', await desktop.locator('[data-character]').count() === 19 && await desktop.locator('[data-character][aria-pressed="true"]').count() === 1 && await option(desktop, 'classic').getAttribute('aria-label') === '选择Joke Bear');
  await assertAllImages(desktop);
  await desktop.screenshot({ path: `${out}/characters-desktop-open.png`, fullPage: true, animations: 'disabled' });
  const before = await readGame(desktop);
  await desktop.keyboard.press('Tab');
  check('Tab reaches the first character button', await option(desktop, 'classic').evaluate(el => el === document.activeElement));
  await desktop.keyboard.press('5'); await desktop.keyboard.press('n');
  const after = await readGame(desktop);
  check('character keyboard focus does not steal Sudoku inputs or toggle pencil mode', JSON.stringify(before.game) === JSON.stringify(after.game) && before.noteMode === after.noteMode && before.selected === after.selected);
  await desktop.keyboard.press('Tab'); await desktop.keyboard.press('Enter');
  check('keyboard chooses second character, closes and returns focus to summary', await current(desktop) === '吉伊' && !await picker(desktop).evaluate(el => el.open) && await summary(desktop).evaluate(el => el === document.activeElement));
  check('selection persisted to its separate versioned key only', await desktop.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)); return value.version === 1 && value.id === 'chiikawa'; }, key));
  await desktop.reload({ waitUntil: 'networkidle' });
  check('reload restores character name and portrait', await current(desktop) === '吉伊' && (await desktop.locator('#companion-image').getAttribute('src')).endsWith('/chiikawa.webp'));
  for (const [id, name] of characters) {
    await summary(desktop).click(); await option(desktop, id).click();
    check(`select ${id} updates name, portrait, pressed state, and collapses`, await current(desktop) === name && (await desktop.locator('#companion-image').getAttribute('src')).endsWith(`/${id}.webp`) && await option(desktop, id).getAttribute('aria-pressed') === 'true' && !await picker(desktop).evaluate(el => el.open));
  }
  await summary(desktop).click(); await option(desktop, 'bear-pirate').focus(); await desktop.keyboard.press('Escape');
  check('Escape inside picker collapses and returns focus to summary', !await picker(desktop).evaluate(el => el.open) && await summary(desktop).evaluate(el => el === document.activeElement));
  check('desktop has no horizontal overflow and adds no game dialog', await noOverflow(desktop) && await desktop.locator('dialog').count() === 1 && !await desktop.locator('dialog').isVisible());
  const empty = desktop.locator('.cell.entered').first();
  await empty.click(); await desktop.keyboard.press('5');
  check('real Sudoku keyboard input still works after character changes', (await empty.innerText()).includes('5'));

  const mobile = await setup({ viewport: { width: 360, height: 844 }, touch: true });
  check('360px closed companion fits without horizontal overflow', await noOverflow(mobile) && await mobile.locator('#companion-image').isVisible());
  await mobile.screenshot({ path: `${out}/characters-mobile-360.png`, fullPage: true, animations: 'disabled' });
  await summary(mobile).tap(); await assertAllImages(mobile);
  check('360px expanded nineteen-character grid stays within page width', await noOverflow(mobile) && await picker(mobile).evaluate(el => el.open));
  await mobile.screenshot({ path: `${out}/characters-mobile-360-open.png`, fullPage: true, animations: 'disabled' });
  await option(mobile, 'bear-astronaut').tap();
  check('mobile tap chooses astronaut and leaves grid visible after collapse', await current(mobile) === '太空熊' && !await picker(mobile).evaluate(el => el.open) && await mobile.locator('#board').isVisible() && await noOverflow(mobile));
  await mobile.reload({ waitUntil: 'networkidle' });
  check('mobile choice persists on refresh', await current(mobile) === '太空熊');

  for (const [label, raw] of [['corrupt JSON', '{broken'], ['illegal id', '{"version":1,"id":"outside"}'], ['unsupported version', '{"version":9,"id":"chiikawa"}']]) {
    const page = await setup({ raw });
    check(`${label} safely defaults to classic`, await current(page) === 'Joke Bear');
    await summary(page).click(); await option(page, 'hachiware').click();
    check(`${label} recovers with valid choice`, await current(page) === '小八' && await page.evaluate(key => JSON.parse(localStorage.getItem(key)).id === 'hachiware', key));
  }
  for (const mode of ['blocked', 'quota']) {
    const page = await setup({ mode });
    await summary(page).click(); await option(page, 'bear-chef').click();
    check(`${mode} storage still supports in-memory selection and notice`, await current(page) === '厨师熊' && await page.locator('#character-storage-note').isVisible() && !await picker(page).evaluate(el => el.open));
    await page.locator('.cell.entered').first().click(); await page.keyboard.press('4');
    check(`${mode} storage leaves actual game playable`, (await page.locator('.cell.entered').first().innerText()).includes('4'));
  }
  check('all character contexts have zero pageerrors, console errors or HTTP errors', errors.length === 0);
  await writeFile(`${out}/characters-results.json`, JSON.stringify({ base, passed: checks.length, checks, errors }, null, 2));
  console.log(`\n${checks.length} character checks passed at ${base}. Evidence: ${out}`);
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
  if (errors.length) console.error(errors);
}
