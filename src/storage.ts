import { isComplete, MAX_HISTORY, type Game, type Snapshot } from './engine';
import { BASE_PUZZLES, DIFFICULTIES, type Difficulty, type Puzzle } from './puzzles';
import { MAX_ELAPSED } from './clock';
export const STORAGE_KEY = 'puzzle-sudoku-v1';
export type Records = Record<Difficulty, number | null>;
export interface Current { game: Game; elapsedMs: number; selected: number; noteMode: boolean }
export interface Save { version: 1; best: Records; current: Current | null }
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const emptySave = (): Save => ({ version: 1, best: { easy: null, medium: null, hard: null }, current: null });
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const integer = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const grid = (v: unknown): v is number[] => Array.isArray(v) && v.length === 81 && v.every(n => integer(n, 0, 9));
const time = (v: unknown): v is number => integer(v, 0, MAX_ELAPSED);
function validPuzzle(value: unknown): value is Puzzle {
  if (!object(value) || !BASE_PUZZLES.some(p => p.id === value.id && p.difficulty === value.difficulty) || !grid(value.givens) || !grid(value.solution) || !isComplete(value.solution)) return false;
  const givens = value.givens, solution = value.solution;
  const base = BASE_PUZZLES.find(p => p.id === value.id)!;
  return givens.filter(Boolean).length === base.givens.filter(Boolean).length && givens.every((n, i) => n === 0 || n === solution[i]);
}
function validSnapshot(value: unknown, puzzle: Puzzle): value is Snapshot {
  if (!object(value) || !grid(value.board) || !Array.isArray(value.notes) || value.notes.length !== 81) return false;
  const board = value.board;
  return board.every((n, i) => !puzzle.givens[i] || n === puzzle.givens[i]) && value.notes.every((ns: unknown, i: number) => Array.isArray(ns) && ns.length <= 9 && ns.every(n => integer(n, 1, 9)) && new Set(ns).size === ns.length && (!board[i] || ns.length === 0));
}
function validCurrent(value: unknown): value is Current {
  if (!object(value) || !object(value.game) || !validPuzzle(value.game.puzzle) || !time(value.elapsedMs) || !integer(value.selected, 0, 80) || typeof value.noteMode !== 'boolean') return false;
  const game = value.game, puzzle = value.game.puzzle;
  return validSnapshot(game, puzzle) && Array.isArray(game.history) && game.history.length <= MAX_HISTORY && game.history.every(item => validSnapshot(item, puzzle));
}
export function parseSave(text: string | null): Save {
  if (!text || text.length > 1_000_000) return emptySave();
  try {
    const value: unknown = JSON.parse(text);
    if (!object(value) || value.version !== 1 || !object(value.best)) return emptySave();
    const best = value.best;
    if (!DIFFICULTIES.every(d => best[d] === null || time(best[d]))) return emptySave();
    return { version: 1, best: best as Records, current: validCurrent(value.current) ? value.current : null };
  } catch { return emptySave(); }
}
export function load(storage: StorageLike): { save: Save; available: boolean } {
  try { return { save: parseSave(storage.getItem(STORAGE_KEY)), available: true }; }
  catch { return { save: emptySave(), available: false }; }
}
export function persist(storage: StorageLike, save: Save): boolean {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(save)); return true; }
  catch { return false; }
}
export function recordBest(best: Records, difficulty: Difficulty, elapsedMs: number): Records {
  const previous = best[difficulty];
  const time = Math.floor(elapsedMs);
  return { ...best, [difficulty]: previous === null ? time : Math.min(previous, time) };
}
