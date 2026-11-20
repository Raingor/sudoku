import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = process.env.GAME_URL || 'http://localhost:5180';
const label = process.env.SMOKE_LABEL || (base.includes('4180') ? 'preview' : 'dev');
const out = fileURLToPath(new URL(`../artifacts/${label}/`, import.meta.url));
const key = 'puzzle-sudoku-v1';
// Test-side save fixture, no product globals or /src imports; works against built Pages too.
const givens = [...'020080106670520089983000005706005010200009007809046032457392060392100754100000090'].map(Number);
const solution = [...'524983176671524389983671425746235918235819647819746532457392861392168754168457293'].map(Number);
const fixture = (board = givens, elapsedMs = 65000) => ({
  version: 1, best: { easy: null, medium: 240000, hard: null },
  current: { game: { puzzle: { id: 'easy-1', difficulty: 'easy', givens, solution }, board: [...board], notes: Array.from({ length: 81 }, () => []), history: [] }, elapsedMs, selected: 0, noteMode: false },
});
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const contexts = [], errors = [], checks = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); console.log('PASS', name); };
const cell = (page, i) => page.locator(`[data-index="${i}"]`);
const readSave = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
async function setup(save = fixture(), options = {}, mode = '') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options }); contexts.push(context);
  await context.addInitScript(({ key, save, mode }) => {
    if (mode === 'blocked') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    else if (!sessionStorage.getItem('sudoku-fixture')) {
      localStorage.setItem(key, mode === 'corrupt' ? '{broken' : JSON.stringify(save)); sessionStorage.setItem('sudoku-fixture', '1');
    }
  }, { key, save, mode });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console ${m.text()}`); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(base, { waitUntil: 'networkidle' }); await page.locator('.cell').last().waitFor();
  // Capture the settled interface, not the first transparent frame of its entrance.
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished)));
  return { page, context };
}
async function digit(page, n, touch = false) { const button = page.locator(`[data-digit="${n}"]`); if (touch) await button.tap(); else await button.click(); }
async function confirm(page, trigger) { await page.locator(trigger).click(); await page.locator('[data-action="confirm"]').click(); }
try {
  await mkdir(out, { recursive: true });
  const { page } = await setup();
  check('desktop renders 81 cells, 9 rows, no overflow', await page.locator('.cell').count() === 81 && await page.locator('[role="row"]').count() === 9 && await noOverflow(page));
  check('restores selected difficulty and timer from real save', await page.locator('#difficulty').inputValue() === 'easy' && (await page.locator('#timer').textContent()).startsWith('01:0'));
  await page.screenshot({ path: `${out}/desktop-1440.png`, fullPage: true, animations: 'disabled' });
  await cell(page, 0).click();
  check('focused cell has visible focus ring', await cell(page, 0).evaluate(el => getComputedStyle(el).outlineStyle !== 'none' || getComputedStyle(el).boxShadow !== 'none'));
  await page.keyboard.press('5');
  check('real keyboard digit edits chosen empty cell', (await readSave(page)).current.game.board[0] === 5 && await cell(page, 0).innerText() === '5');
  await page.keyboard.press('Control+z');
  check('real keyboard undo restores digit', (await readSave(page)).current.game.board[0] === 0);
  await page.keyboard.press('n'); await page.keyboard.press('3'); await page.keyboard.press('7');
  check('keyboard notes are candidates not answers', JSON.stringify((await readSave(page)).current.game.notes[0]) === '[3,7]' && (await readSave(page)).current.game.board[0] === 0 && await page.locator('#note').getAttribute('aria-pressed') === 'true');
  await page.keyboard.press('3');
  check('repeating note toggles it off', JSON.stringify((await readSave(page)).current.game.notes[0]) === '[7]');
  await page.locator('#erase').click();
  check('erase clears notes', (await readSave(page)).current.game.notes[0].length === 0);
  await page.locator('#undo').click();
  check('toolbar undo restores exact notes', JSON.stringify((await readSave(page)).current.game.notes[0]) === '[7]');
  await page.locator('#note').click(); await digit(page, 2);
  check('number pad fills answer and clears notes', (await readSave(page)).current.game.board[0] === 2 && (await readSave(page)).current.game.notes[0].length === 0);
  check('conflict is marked visually, textually and via aria', await cell(page, 0).getAttribute('aria-invalid') === 'true' && await cell(page, 1).getAttribute('aria-invalid') === 'true' && await cell(page, 0).locator('.conflict-mark').textContent() === '!' && (await page.locator('#status').textContent()).includes('重复'));
  await page.screenshot({ path: `${out}/conflict.png`, fullPage: true, animations: 'disabled' });
  await cell(page, 1).click(); await page.keyboard.press('9'); await page.keyboard.press('Delete');
  check('given cannot be overwritten or erased via real keyboard', (await readSave(page)).current.game.board[1] === 2 && await page.locator('#erase').isDisabled() && await page.locator('[data-digit="1"]').isDisabled());
  await cell(page, 0).click(); await page.keyboard.press('Delete');
  check('deleting conflicting user answer clears all conflicts', (await readSave(page)).current.game.board[0] === 0 && await page.locator('.conflict').count() === 0);
  await page.keyboard.press('ArrowRight');
  check('arrow keys navigate within game focus', await cell(page, 1).evaluate(el => el === document.activeElement));
  await page.locator('#help').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('8');
  check('shortcuts outside board do not edit selection or board', (await readSave(page)).current.selected === 1 && (await readSave(page)).current.game.board[0] === 0);
  await page.keyboard.press('Enter');
  check('keyboard opens rules with complete rules and difficulty disclaimer', await page.locator('dialog').isVisible() && (await page.locator('.rules').textContent()).includes('空格数量并不严格代表推理难度'));
  const beforeDialogTime = (await readSave(page)).current.elapsedMs;
  await page.waitForTimeout(1100); await page.keyboard.press('5'); await page.keyboard.press('Tab');
  check('modal pauses clock and traps focus without editing board', (await readSave(page)).current.elapsedMs === beforeDialogTime && await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)) && (await readSave(page)).current.game.board[0] === 0);
  await page.keyboard.press('Escape');
  check('Escape closes rules and returns focus', !await page.locator('dialog').isVisible() && await page.locator('#help').evaluate(el => el === document.activeElement));
  await cell(page, 0).click(); await page.keyboard.press('5'); await page.keyboard.press('n');
  const beforeReload = (await readSave(page)).current;
  await page.reload({ waitUntil: 'networkidle' });
  const afterReload = (await readSave(page)).current;
  check('refresh preserves board, notes, undo, selection and pencil mode', JSON.stringify(afterReload.game) === JSON.stringify(beforeReload.game) && afterReload.noteMode === beforeReload.noteMode && afterReload.selected === beforeReload.selected && afterReload.elapsedMs >= beforeReload.elapsedMs);
  await page.locator('#restart').click(); await page.keyboard.press('Escape');
  check('cancel restart preserves progress', (await readSave(page)).current.game.board[0] === 5);
  await confirm(page, '#restart');
  const reset = (await readSave(page)).current;
  check('restart retains exact puzzle and resets board, notes, undo, mode and clock', JSON.stringify(reset.game.board) === JSON.stringify(givens) && reset.game.history.length === 0 && reset.game.notes.every(ns => ns.length === 0) && !reset.noteMode && reset.elapsedMs < 1000);
  for (const difficulty of ['medium', 'hard', 'easy']) {
    await page.locator('#difficulty').selectOption(difficulty); await page.locator('[data-action="confirm"]').click();
    const save = await readSave(page);
    check(`real difficulty selection switches to ${difficulty} with clean game`, save.current.game.puzzle.difficulty === difficulty && save.current.game.history.length === 0 && save.current.elapsedMs < 1000 && save.best.medium === 240000);
  }
  await page.locator('#difficulty').selectOption('hard'); await page.keyboard.press('Escape');
  check('cancel difficulty leaves current group and select consistent', (await readSave(page)).current.game.puzzle.difficulty === 'easy' && await page.locator('#difficulty').inputValue() === 'easy');
  const prior = (await readSave(page)).current.game.puzzle.givens;
  await confirm(page, '#new');
  check('new puzzle uses transformed local library with no online generator', JSON.stringify((await readSave(page)).current.game.puzzle.givens) !== JSON.stringify(prior));
  await page.locator('#restart').click(); await page.locator('[data-action="confirm"]').dblclick();
  check('rapid confirmed restart has no stale state', (await readSave(page)).current.game.history.length === 0 && !await page.locator('dialog').isVisible());
  check('no product cheat globals', await page.evaluate(() => !('game' in window) && !('__GAME__' in window)));

  const almost = [...solution]; almost[0] = 0;
  const victory = (await setup(fixture(almost, 125000))).page;
  await cell(victory, 0).click(); await victory.keyboard.press('5');
  const won = await readSave(victory);
  check('real final keyboard input wins complete legal board', won.current.game.board.every((n, i) => n === solution[i]) && await victory.locator('dialog').isVisible() && (await victory.locator('#dialog-title').textContent()).includes('九宫有序'));
  check('winning time saved only to matching difficulty', won.best.easy >= 125000 && won.best.easy < 130000 && won.best.medium === 240000 && won.best.hard === null);
  await victory.screenshot({ path: `${out}/victory.png`, fullPage: true, animations: 'disabled' });
  await victory.locator('[data-action="close"]').click();
  await victory.screenshot({ path: `${out}/completed-board.png`, fullPage: true, animations: 'disabled' });
  check('completed board locks editing and undo', await victory.locator('#undo').isDisabled() && await victory.locator('#note').isDisabled() && await victory.locator('[data-digit="1"]').isDisabled());
  await victory.reload({ waitUntil: 'networkidle' });
  check('refresh keeps completion and exact best record', (await readSave(victory)).best.easy === won.best.easy && await victory.locator('dialog').isVisible());
  await victory.locator('[data-action="next"]').click();
  check('victory next starts a fresh playable board retaining record', !await victory.locator('dialog').isVisible() && (await readSave(victory)).current.game.board.some(n => n === 0) && (await readSave(victory)).best.easy === won.best.easy);

  const invalidFull = [...solution]; invalidFull[0] = 2;
  const invalid = (await setup(fixture(invalidFull))).page;
  check('full but illegal board never displays victory or records best', !await invalid.locator('dialog').isVisible() && (await readSave(invalid)).best.easy === null && await invalid.locator('.conflict').count() > 0);

  const mobile = (await setup(fixture(), { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })).page;
  await cell(mobile, 0).tap(); await mobile.locator('#note').tap(); await digit(mobile, 4, true); await digit(mobile, 8, true);
  check('390px real touch keypad writes notes', JSON.stringify((await readSave(mobile)).current.game.notes[0]) === '[4,8]');
  await mobile.locator('#erase').tap(); await mobile.locator('#undo').tap();
  check('touch erase and undo restore notes', JSON.stringify((await readSave(mobile)).current.game.notes[0]) === '[4,8]');
  await mobile.screenshot({ path: `${out}/mobile-390.png`, fullPage: true, animations: 'disabled' });
  await mobile.locator('#note').tap(); await digit(mobile, 5, true);
  check('touch mode switch and answer input work', (await readSave(mobile)).current.game.board[0] === 5);
  check('390px mobile no overflow and bottom keypad fits viewport', await noOverflow(mobile) && (await mobile.locator('.game-actions').boundingBox()).y + (await mobile.locator('.game-actions').boundingBox()).height <= 844);
  await mobile.locator('#help').tap();
  check('mobile help opens and has tappable close', await mobile.locator('dialog').isVisible());
  await mobile.locator('[data-action="close"]').tap();
  await mobile.locator('#restart').tap(); await mobile.locator('[data-action="confirm"]').tap();
  check('mobile touch restart clears answers', (await readSave(mobile)).current.game.board[0] === 0);
  await mobile.locator('#difficulty').selectOption('hard'); await mobile.locator('[data-action="confirm"]').tap();
  check('mobile difficulty switches with real confirmation', (await readSave(mobile)).current.game.puzzle.difficulty === 'hard');
  for (const difficulty of ['easy', 'medium', 'hard']) {
    await mobile.locator('#restart').tap(); await mobile.locator('[data-action="confirm"]').tap();
    await mobile.locator('#difficulty').selectOption(difficulty); await mobile.locator('[data-action="confirm"]').tap();
    check(`rapid adjacent dialogs retain ${difficulty} confirmation callback`, (await readSave(mobile)).current.game.puzzle.difficulty === difficulty);
  }

  const narrow = (await setup(fixture(), { viewport: { width: 360, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })).page;
  await cell(narrow, 0).tap(); await digit(narrow, 5, true);
  check('360px reduced-motion stays playable without overflow', await noOverflow(narrow) && (await readSave(narrow)).current.game.board[0] === 5 && await narrow.locator('.play-area').evaluate(el => getComputedStyle(el).animationName === 'none'));
  await narrow.screenshot({ path: `${out}/mobile-360-reduced-motion.png`, fullPage: true, animations: 'disabled' });
  const touchWin = (await setup(fixture(almost), { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).page;
  await cell(touchWin, 0).tap(); await digit(touchWin, 5, true);
  check('last empty cell also wins via real mobile keypad tap', await touchWin.locator('dialog').isVisible() && (await readSave(touchWin)).best.easy >= 65000);

  const blocked = (await setup(undefined, {}, 'blocked')).page;
  const blank = await blocked.locator('.cell.entered').first(); await blank.click(); await blocked.keyboard.press('5');
  check('blocked storage still supports real play with explicit notice', await blocked.locator('#storage-note').isVisible() && (await blank.innerText()).includes('5'));
  const corrupt = (await setup(undefined, {}, 'corrupt')).page;
  check('corrupt JSON recovers to valid playable save', (await readSave(corrupt)).version === 1 && (await readSave(corrupt)).current.game.board.length === 81);
  const wrong = (await setup({ version: 1, best: { easy: 'bad', medium: null, hard: null }, current: { nope: true } })).page;
  check('invalid save fields recover without crash', (await readSave(wrong)).best.easy === null && (await readSave(wrong)).current.game.board.some(n => !n));
  check('zero pageerror, console error, HTTP errors or 404s across all contexts', errors.length === 0);
  await writeFile(`${out}/smoke-results.json`, JSON.stringify({ base, label, passed: checks.length, checks, errors }, null, 2));
  console.log(`\n${checks.length} browser checks passed at ${base}; screenshots ${out}`);
} finally {
  await Promise.all(contexts.map(context => context.close())); await browser.close();
  if (errors.length) console.error(errors);
}
