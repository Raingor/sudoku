import './style.css';
import { createGame, edit, undo, conflicts, isComplete, peers, filledCount, type Game } from './engine';
import { DIFFICULTIES, LABELS, newPuzzle, type Difficulty } from './puzzles';
import { Clock, formatTime } from './clock';
import { emptySave, load, persist, recordBest, type StorageLike } from './storage';

const icon = (name: string) => {
  const paths: Record<string, string> = {
    pencil: '<path d="m14 3 7 7M4 14 15 3a2 2 0 0 1 3 0l3 3a2 2 0 0 1 0 3L10 20l-7 1 1-7Z"/>',
    erase: '<path d="m14 3 7 7a2 2 0 0 1 0 3l-8 8H7l-5-5a2 2 0 0 1 0-3L11 3a2 2 0 0 1 3 0ZM7 9l9 9M13 21h9"/>',
    undo: '<path d="M9 5 3 11l6 6M3 11h11a7 7 0 0 1 7 7v2"/>',
    reset: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
    next: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? ''}</svg>`;
};
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="masthead">
    <a class="brand" href="./" aria-label="方寸数独首页"><span class="brand-mark" aria-hidden="true"></span><span>方寸<span class="brand-sub">SUDOKU</span></span></a>
    <span class="masthead-note">一页纸，一段专注的时光。</span>
    <button id="help" class="help-button">玩法说明 <span aria-hidden="true">?</span></button>
  </header>
  <main>
    <section class="introduction" aria-labelledby="title">
      <p class="eyebrow">THE QUIET PUZZLE · No. 09</p>
      <h1 id="title">留一刻，<br>给<span>思考。</span></h1>
      <p class="intro-copy">从一个确定的数字开始，<br>让纷繁，慢慢归于有序。</p>
      <div class="paper-note"><span class="note-number">01—09</span><p>每一行，每一列，每一宫。<br>九个数字，恰好各一次。</p><span class="note-stroke" aria-hidden="true"></span></div>
      <p class="desktop-hint">无需赶时间。<br>每一次推敲，都算数。</p>
    </section>
    <section class="play-area" aria-label="数独游戏">
      <div class="game-topline">
        <label class="difficulty-label" for="difficulty">难度 <select id="difficulty">${DIFFICULTIES.map(d => `<option value="${d}">${LABELS[d]}</option>`).join('')}</select></label>
        <div class="time-meta"><span class="elapsed">${icon('clock')}<span id="timer" aria-label="用时">00:00</span></span><span class="best">本档最佳 <span id="best">—</span></span></div>
      </div>
      <div id="board" class="board" role="grid" aria-label="数独棋盘，方向键选择，数字键填写，N 切换笔记" aria-rowcount="9" aria-colcount="9"></div>
      <div class="board-caption"><p id="status" role="status" aria-live="polite">选择空格，写下第一个数字。</p><span id="filled"></span></div>
      <div class="tools" aria-label="编辑工具">
        <button id="note" aria-pressed="false">${icon('pencil')}<span>笔记</span><span class="mode-badge" id="note-state">关</span></button>
        <button id="erase">${icon('erase')}<span>擦除</span><kbd>⌫</kbd></button>
        <button id="undo">${icon('undo')}<span>撤销</span><kbd>⌘ Z</kbd></button>
      </div>
      <div class="number-pad" aria-label="数字键盘">${Array.from({ length: 9 }, (_, i) => `<button data-digit="${i + 1}" aria-label="填写数字 ${i + 1}"><span>${i + 1}</span><small data-remaining="${i + 1}" aria-hidden="true"></small></button>`).join('')}</div>
      <div class="game-actions"><button id="restart">${icon('reset')}重新开始</button><button id="new" class="new-game">换一道题 ${icon('next')}</button></div>
      <p id="storage-note" class="storage-note" hidden>浏览器存储不可用。本局仍可正常游玩，刷新后进度与纪录可能丢失。</p>
      <p class="keyboard-hint">方向键选择 · 1–9 填写 · N 笔记 · Delete 擦除</p>
    </section>
  </main>
  <footer><span>方寸之间，自有天地。</span><span>原创题库 · 离线可玩 · 自动续局</span></footer>
  <dialog id="modal" aria-labelledby="dialog-title"><div class="dialog-inner"><p class="eyebrow" id="dialog-kicker"></p><h2 id="dialog-title"></h2><div id="dialog-body"></div><div id="dialog-actions"></div></div></dialog>
`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const board = $('#board'), modal = $<HTMLDialogElement>('#modal'), difficultySelect = $<HTMLSelectElement>('#difficulty');
const cellButtons: HTMLButtonElement[] = [];
for (let r = 0; r < 9; r++) {
  const row = document.createElement('div'); row.className = 'board-row'; row.setAttribute('role', 'row');
  for (let c = 0; c < 9; c++) {
    const cell = document.createElement('button');
    cell.type = 'button'; cell.className = 'cell'; cell.dataset.index = String(r * 9 + c); cell.dataset.row = String(r); cell.dataset.col = String(c);
    cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-rowindex', String(r + 1)); cell.setAttribute('aria-colindex', String(c + 1));
    cellButtons.push(cell); row.append(cell);
  }
  board.append(row);
}
let storage: StorageLike;
try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error('unavailable'); }, setItem() { throw new Error('unavailable'); } }; }
const loaded = load(storage);
let saved = loaded.save;
let available = loaded.available;
let game: Game = saved.current?.game ?? createGame(newPuzzle('easy'));
let selected = saved.current?.selected ?? game.board.findIndex(n => !n);
let noteMode = saved.current?.noteMode ?? false;
const clock = new Clock(saved.current?.elapsedMs ?? 0);
let confirmAction: (() => void) | null = null;

function save(): void {
  saved.current = { game, elapsedMs: Math.floor(clock.elapsed()), selected, noteMode };
  if (!persist(storage, saved)) available = false;
  $('#storage-note').hidden = available;
}
function resumeClock(): void { if (!document.hidden && !modal.open && !isComplete(game.board)) clock.resume(); }
function say(message: string): void { $('#status').textContent = message; }
function updateTime(): void { $('#timer').textContent = formatTime(clock.elapsed()); }
function focusCell(): void { cellButtons[selected].focus({ preventScroll: true }); }
function render(): void {
  const bad = conflicts(game.board), complete = isComplete(game.board), value = game.board[selected];
  cellButtons.forEach((cell, index) => {
    const given = Boolean(game.puzzle.givens[index]), n = game.board[index], ns = game.notes[index];
    cell.className = ['cell', given ? 'given' : 'entered', index === selected ? 'selected' : peers(index, selected) ? 'related' : '', value && n === value ? 'same' : '', bad.has(index) ? 'conflict' : ''].filter(Boolean).join(' ');
    cell.tabIndex = index === selected ? 0 : -1;
    cell.setAttribute('aria-selected', String(index === selected)); cell.setAttribute('aria-readonly', String(given || complete)); cell.setAttribute('aria-invalid', String(bad.has(index)));
    const r = Math.floor(index / 9) + 1, c = index % 9 + 1;
    cell.setAttribute('aria-label', `第${r}行第${c}列，${n ? `数字${n}` : ns.length ? `笔记${ns.join('、')}` : '空格'}${given ? '，题目固定' : ''}${bad.has(index) ? '，冲突' : ''}`);
    cell.innerHTML = n ? `<span class="digit">${n}</span>${bad.has(index) ? '<span class="conflict-mark" aria-hidden="true">!</span>' : ''}` : `<span class="notes" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<span>${ns.includes(i + 1) ? i + 1 : ''}</span>`).join('')}</span>`;
  });
  difficultySelect.value = game.puzzle.difficulty;
  $('#note').setAttribute('aria-pressed', String(noteMode)); $('#note-state').textContent = noteMode ? '开' : '关';
  $<HTMLButtonElement>('#note').disabled = complete;
  $<HTMLButtonElement>('#undo').disabled = !game.history.length || complete;
  $<HTMLButtonElement>('#erase').disabled = complete || Boolean(game.puzzle.givens[selected]) || (!game.board[selected] && !game.notes[selected].length);
  $('#filled').textContent = `${filledCount(game)} / 81`;
  const best = saved.best[game.puzzle.difficulty]; $('#best').textContent = best === null ? '—' : formatTime(best);
  document.querySelectorAll<HTMLButtonElement>('[data-digit]').forEach(button => {
    const n = Number(button.dataset.digit), remaining = Math.max(0, 9 - game.board.filter(x => x === n).length);
    button.disabled = complete || Boolean(game.puzzle.givens[selected]);
    button.setAttribute('aria-label', `${noteMode ? '笔记' : '填写'}数字 ${n}`);
    button.querySelector('small')!.textContent = String(remaining);
  });
  updateTime();
}
function select(index: number, focus = true): void {
  selected = index; render(); save();
  say(isComplete(game.board) ? '本题已完成。换一道题，继续思考。' : game.puzzle.givens[index] ? '题目固定数字，不可修改。' : noteMode ? '笔记模式：记录候选数字，再按一次可移除。' : '数字模式：选择下方数字，或用键盘填写。');
  if (focus) focusCell();
}
function apply(next: Game): void {
  if (next === game) { if (game.puzzle.givens[selected]) say('题目固定数字，不可修改。'); return; }
  game = next;
  if (isComplete(game.board)) {
    clock.pause(); saved.best = recordBest(saved.best, game.puzzle.difficulty, clock.elapsed());
    render(); save(); showWin();
  } else {
    render(); save();
    const count = conflicts(game.board).size;
    say(count ? `有 ${count} 格与同行、同列或同宫的数字重复，请检查标有 ! 的格子。` : noteMode ? '笔记已更新。候选数字不计作答案。' : '已记录。慢慢来，每一步都算数。');
  }
}
function enter(digit: number): void { apply(edit(game, selected, digit, noteMode)); }
function start(difficulty: Difficulty, restart = false): void {
  game = createGame(restart ? game.puzzle : newPuzzle(difficulty));
  selected = game.board.findIndex(n => !n); noteMode = false; clock.reset();
  render(); save(); say(restart ? '同一道题，重新开始。' : `已换为${LABELS[difficulty]}题目。选择一格，开始吧。`); resumeClock();
}
function showDialog(kicker: string, title: string, body: string, actions: string): void {
  clock.pause(); save(); $('#dialog-kicker').textContent = kicker; $('#dialog-title').textContent = title;
  $('#dialog-body').innerHTML = body; $('#dialog-actions').innerHTML = actions;
  if (!modal.open) modal.showModal();
}
const closeButton = '<button data-action="close" class="dialog-primary">回到棋盘</button>';
function showWin(): void {
  confirmAction = null;
  showDialog('A MOMENT WELL SPENT', '九宫有序，心也清朗。', `<p class="win-time">${formatTime(clock.elapsed())}</p><p>恭喜完成${LABELS[game.puzzle.difficulty]}数独。<br>本档最佳 ${formatTime(saved.best[game.puzzle.difficulty] ?? clock.elapsed())}，已${available ? '保存在此浏览器' : '记入本次会话'}。</p>`, '<button data-action="close">欣赏棋盘</button><button data-action="next" class="dialog-primary">再解一道</button>');
}
function confirm(title: string, description: string, action: () => void): void {
  confirmAction = action;
  showDialog('A FRESH PAGE', title, `<p>${description}<br>本地最佳纪录不会被清除。</p>`, '<button data-action="close" autofocus>继续本局</button><button data-action="confirm" class="dialog-primary">确认开始</button>');
}
$('#help').addEventListener('click', () => {
  confirmAction = null;
  showDialog('HOW TO PLAY', '九个数字，恰好各一次。', `<div class="rules"><p>在空格中填入 1–9，让每行、每列和每个 3×3 宫内的数字都不重复。全部填满且符合规则，才算完成。</p><p>深色数字为题目固定格，不可修改。同行、同列或同宫重复时，冲突格会出现 <strong>!</strong>，这不是答案校对：没有冲突也未必正确。</p><p><strong>笔记</strong>记录候选数字，重复输入可移除；候选不会自动消除。擦除可清空当前格的数字或笔记；撤销最多保留最近 200 次编辑。</p><p><strong>键盘</strong>：方向键选择，1–9 填写，N 切换笔记，Delete / Backspace / 0 擦除，Ctrl / ⌘ + Z 撤销。快捷键只在棋盘聚焦时生效。</p><p>计时在弹窗打开、页面隐藏及完成时暂停。进度与分档最佳仅存于此浏览器，清理浏览器数据会丢失。</p><p class="rules-small">三档为原创题库的策略分组，基础题各两道，经唯一解验证；空格数量并不严格代表推理难度。每次新题通过合法变换产生变化。</p></div>`, closeButton);
});
$('#restart').addEventListener('click', () => confirm('同一道题，重新来过？', '本局填写、笔记与用时将清空。', () => start(game.puzzle.difficulty, true)));
$('#new').addEventListener('click', () => confirm('翻到新的一页？', '将换一道题，当前进度不会保留。', () => start(game.puzzle.difficulty)));
difficultySelect.addEventListener('change', () => {
  const next = difficultySelect.value as Difficulty; difficultySelect.value = game.puzzle.difficulty;
  if (next !== game.puzzle.difficulty) confirm(`开始一题${LABELS[next]}数独？`, '切换题库会清空本局进度与用时。', () => start(next));
});
modal.addEventListener('click', event => {
  const action = (event.target as Element).closest<HTMLButtonElement>('[data-action]')?.dataset.action;
  if (!action) return;
  const callback = confirmAction; confirmAction = null; modal.close();
  if (action === 'confirm') callback?.();
  if (action === 'next') start(game.puzzle.difficulty);
});
modal.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});
// close is queued asynchronously: an older close event must not erase the next
// confirmation callback if the player opens another dialog immediately.
modal.addEventListener('cancel', () => { confirmAction = null; });
modal.addEventListener('close', () => { resumeClock(); save(); });
$('#note').addEventListener('click', () => { noteMode = !noteMode; render(); save(); say(noteMode ? '笔记模式已开启。' : '已回到数字模式。'); });
$('#erase').addEventListener('click', () => { apply(edit(game, selected, 0)); focusCell(); });
$('#undo').addEventListener('click', () => { apply(undo(game)); focusCell(); });
board.addEventListener('click', event => {
  const index = (event.target as Element).closest<HTMLButtonElement>('[data-index]')?.dataset.index;
  if (index !== undefined) select(Number(index));
});
document.querySelectorAll<HTMLButtonElement>('[data-digit]').forEach(button => button.addEventListener('click', () => { enter(Number(button.dataset.digit)); if (!modal.open) focusCell(); }));
board.addEventListener('keydown', event => {
  if (modal.open || !(event.target instanceof HTMLButtonElement)) return;
  const key = event.key;
  if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === 'z') { event.preventDefault(); if (!event.shiftKey) apply(undo(game)); return; }
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const r = Math.floor(selected / 9), c = selected % 9;
  const moves: Record<string, number> = { ArrowLeft: r * 9 + Math.max(0, c - 1), ArrowRight: r * 9 + Math.min(8, c + 1), ArrowUp: Math.max(0, r - 1) * 9 + c, ArrowDown: Math.min(8, r + 1) * 9 + c, Home: r * 9, End: r * 9 + 8 };
  if (key in moves) { event.preventDefault(); select(moves[key]); }
  else if (/^[1-9]$/.test(key)) { event.preventDefault(); enter(Number(key)); }
  else if (['Backspace', 'Delete', '0'].includes(key)) { event.preventDefault(); apply(edit(game, selected, 0)); }
  else if (key.toLowerCase() === 'n' && !isComplete(game.board)) { event.preventDefault(); noteMode = !noteMode; render(); save(); say(noteMode ? '笔记模式已开启。' : '已回到数字模式。'); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { clock.pause(); save(); } else resumeClock(); });
window.addEventListener('pagehide', () => { clock.pause(); save(); });
window.addEventListener('pageshow', resumeClock);
setInterval(() => { updateTime(); if (!document.hidden && !modal.open && !isComplete(game.board)) save(); }, 1000);
if (!saved.best) saved = emptySave();
render(); save(); resumeClock();
if (isComplete(game.board)) showWin();
