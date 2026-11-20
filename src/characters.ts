// Local portrait roster copied from xiaoxiaole, with no sibling runtime import.
export const CHARACTERS = [
  { id: 'classic', name: 'Joke Bear', short: '自嘲熊' },
  { id: 'chiikawa', name: '吉伊', short: '吉伊' },
  { id: 'hachiware', name: '小八', short: '小八' },
  { id: 'usagi', name: '乌萨奇', short: '乌萨奇' },
  { id: 'mole-croquette', name: '鼹鼠饼', short: '鼹鼠饼' },
  { id: 'old-dog', name: '老头狗', short: '老头狗' },
  { id: 'bear-raincoat', name: '小黄鸭雨衣熊', short: '雨衣熊' },
  { id: 'bear-pajama', name: '睡衣派对熊', short: '睡衣熊' },
  { id: 'bear-ninja', name: '夜行忍者熊', short: '忍者熊' },
  { id: 'kurimanju', name: '栗子馒头', short: '栗子馒头' },
  { id: 'momonga', name: '飞鼠', short: '飞鼠' },
  { id: 'rakko', name: '海獭', short: '海獭' },
  { id: 'shisa', name: '狮萨', short: '狮萨' },
  { id: 'furuhonya', name: '古本屋', short: '古本屋' },
  { id: 'bear-strawberry', name: '草莓熊', short: '草莓熊' },
  { id: 'bear-frog', name: '青蛙熊', short: '青蛙熊' },
  { id: 'bear-astronaut', name: '太空熊', short: '太空熊' },
  { id: 'bear-chef', name: '厨师熊', short: '厨师熊' },
  { id: 'bear-pirate', name: '海盗熊', short: '海盗熊' },
] as const;
export type Character = typeof CHARACTERS[number];
export const CHARACTER_STORAGE_KEY = 'puzzle-sudoku-character-v1';
export interface CharacterStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
type StorageSource = () => CharacterStorage;
export function parseCharacter(text: string | null): Character {
  if (!text || text.length > 256) return CHARACTERS[0];
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value === 'object' && value !== null && 'version' in value && value.version === 1 && 'id' in value) {
      return CHARACTERS.find(character => character.id === value.id) ?? CHARACTERS[0];
    }
  } catch { /* Corrupt preferences must never prevent a new game. */ }
  return CHARACTERS[0];
}
export function loadCharacter(source: StorageSource): { character: Character; available: boolean } {
  try { return { character: parseCharacter(source().getItem(CHARACTER_STORAGE_KEY)), available: true }; }
  catch { return { character: CHARACTERS[0], available: false }; }
}
export function saveCharacter(source: StorageSource, id: string): boolean {
  if (!CHARACTERS.some(character => character.id === id)) return false;
  try { source().setItem(CHARACTER_STORAGE_KEY, JSON.stringify({ version: 1, id })); return true; }
  catch { return false; }
}
// Relative to the page for static Pages subpaths, never /characters-2d or a sibling.
export function portraitUrl(id: Character['id']): string { return `./characters-2d/${id}.webp`; }
export function mountCharacters(host: HTMLElement, source: StorageSource = () => window.localStorage): void {
  const loaded = loadCharacter(source);
  let current = loaded.character;
  let available = loaded.available;
  host.innerHTML = `
    <details class="character-picker" id="character-picker">
      <summary id="character-summary" aria-label="选择陪伴角色，当前${current.name}">
        <span class="companion-portrait"><img id="companion-image" src="${portraitUrl(current.id)}" alt="${current.name}头像" width="72" height="72"></span>
        <span class="companion-copy"><span class="companion-kicker">今日解题搭子</span><strong id="companion-name">${current.name}</strong><span class="companion-note">陪你慢慢想，步步有答案。</span></span>
        <span class="companion-change">换伙伴 <span aria-hidden="true">＋</span></span>
      </summary>
      <div class="character-panel">
        <p class="character-panel-heading">选一位，一起专注。<span>19 位伙伴 · 全部可选</span></p>
        <div class="character-grid" role="group" aria-label="陪伴角色选择">
          ${CHARACTERS.map(character => `<button type="button" class="character-option" data-character="${character.id}" aria-label="选择${character.name}" aria-pressed="${character.id === current.id}"><img src="${portraitUrl(character.id)}" alt="${character.name}头像" width="64" height="64" loading="lazy"><span>${character.short}</span><span class="character-check" aria-hidden="true">已选</span></button>`).join('')}
        </div>
      </div>
    </details>
    <p id="character-storage-note" class="character-storage-note" ${available ? 'hidden' : ''}>伙伴选择暂无法保存，仍可自由切换。</p>
    <span id="character-announcement" class="character-sr" role="status" aria-live="polite"></span>
  `;
  const picker = host.querySelector<HTMLDetailsElement>('#character-picker')!;
  const summary = host.querySelector<HTMLElement>('#character-summary')!;
  const image = host.querySelector<HTMLImageElement>('#companion-image')!;
  const options = [...host.querySelectorAll<HTMLButtonElement>('[data-character]')];
  const close = () => { picker.open = false; summary.focus({ preventScroll: true }); };
  picker.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-character]');
    const next = CHARACTERS.find(character => character.id === button?.dataset.character);
    if (!next) return;
    current = next;
    image.src = portraitUrl(current.id); image.alt = `${current.name}头像`;
    host.querySelector('#companion-name')!.textContent = current.name;
    summary.setAttribute('aria-label', `选择陪伴角色，当前${current.name}`);
    options.forEach(option => option.setAttribute('aria-pressed', String(option.dataset.character === current.id)));
    if (!saveCharacter(source, current.id)) available = false;
    host.querySelector<HTMLElement>('#character-storage-note')!.hidden = available;
    host.querySelector('#character-announcement')!.textContent = `${current.name}来陪你解题了。`;
    close();
  });
  // Scoped to this disclosure, not the document or the game grid.
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape' && picker.open) { event.preventDefault(); event.stopPropagation(); close(); }
  });
}
