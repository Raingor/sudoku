import type { Puzzle } from './puzzles';

export interface Snapshot { board: number[]; notes: number[][] }
export interface Game extends Snapshot { puzzle: Puzzle; history: Snapshot[] }
export const MAX_HISTORY = 200;
export function createGame(puzzle: Puzzle): Game {
  return { puzzle: { ...puzzle, givens: [...puzzle.givens], solution: [...puzzle.solution] }, board: [...puzzle.givens], notes: Array.from({ length: 81 }, () => []), history: [] };
}
export function peers(a: number, b: number): boolean {
  const ar = Math.floor(a / 9), ac = a % 9, br = Math.floor(b / 9), bc = b % 9;
  return ar === br || ac === bc || (Math.floor(ar / 3) === Math.floor(br / 3) && Math.floor(ac / 3) === Math.floor(bc / 3));
}
export function conflicts(board: readonly number[]): Set<number> {
  const result = new Set<number>();
  for (let a = 0; a < 81; a++) {
    if (!board[a]) continue;
    for (let b = a + 1; b < 81; b++) {
      if (board[a] === board[b] && peers(a, b)) { result.add(a); result.add(b); }
    }
  }
  return result;
}
export function isComplete(board: readonly number[]): boolean {
  return board.length === 81 && board.every(n => Number.isInteger(n) && n >= 1 && n <= 9) && conflicts(board).size === 0;
}
function snapshot(game: Game): Snapshot { return { board: [...game.board], notes: game.notes.map(ns => [...ns]) }; }
export function edit(game: Game, index: number, digit: number, pencil = false): Game {
  if (!Number.isInteger(index) || index < 0 || index >= 81 || !Number.isInteger(digit) || digit < 0 || digit > 9 || game.puzzle.givens[index] || isComplete(game.board)) return game;
  const next = snapshot(game);
  if (pencil && digit !== 0) {
    if (next.board[index]) return game;
    const notes = next.notes[index];
    next.notes[index] = notes.includes(digit) ? notes.filter(n => n !== digit) : [...notes, digit].sort();
  } else {
    if (next.board[index] === digit && next.notes[index].length === 0) return game;
    next.board[index] = digit;
    next.notes[index] = [];
    // Notes are deliberate: do not erase other cells' notes as a side effect.
  }
  return { ...game, ...next, history: [...game.history.slice(-(MAX_HISTORY - 1)), snapshot(game)] };
}
export function undo(game: Game): Game {
  if (!game.history.length || isComplete(game.board)) return game;
  const previous = game.history[game.history.length - 1];
  return { ...game, board: [...previous.board], notes: previous.notes.map(ns => [...ns]), history: game.history.slice(0, -1) };
}
export function filledCount(game: Game): number { return game.board.filter(Boolean).length; }
