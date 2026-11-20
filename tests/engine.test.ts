import { describe, it, expect } from 'vitest';
import { BASE_PUZZLES, DIFFICULTIES, makeTransform, newPuzzle, transformPuzzle } from '../src/puzzles';
import { conflicts, createGame, edit, isComplete, peers, undo, MAX_HISTORY } from '../src/engine';
import { solve, seeded } from './solver';
const puzzle = BASE_PUZZLES[0];
const emptyIndex = puzzle.givens.indexOf(0);

describe('original puzzle library / independent solver', () => {
  for (const p of BASE_PUZZLES) {
    it(`${p.id} has exactly one solution matching the bundled answer`, () => {
      const result = solve(p.givens);
      expect(result.count).toBe(1); expect(result.first).toEqual(p.solution); expect(isComplete(p.solution)).toBe(true);
    });
    for (const seed of [1, 42, 510, 20261120, 99999]) {
      it(`${p.id} legal transformation seed ${seed} preserves solution and uniqueness`, () => {
        const transformed = transformPuzzle(p, makeTransform(seeded(seed)));
        const result = solve(transformed.givens);
        expect(result.count).toBe(1); expect(result.first).toEqual(transformed.solution);
        expect(transformed.givens.filter(Boolean)).toHaveLength(p.givens.filter(Boolean).length);
        expect(transformed.givens).not.toBe(p.givens);
      });
    }
  }
  it('independent solver stops at second solution, rejects contradictory givens', () => {
    expect(solve(Array(81).fill(0)).count).toBe(2);
    const invalid = [...puzzle.givens]; invalid[0] = invalid[1] = 1;
    expect(solve(invalid).count).toBe(0);
  });
  for (const difficulty of DIFFICULTIES) it(`${difficulty} has two original bases and deterministic injectable randomness`, () => {
    expect(BASE_PUZZLES.filter(p => p.difficulty === difficulty)).toHaveLength(2);
    expect(newPuzzle(difficulty, seeded(12))).toEqual(newPuzzle(difficulty, seeded(12)));
    expect(newPuzzle(difficulty, seeded(12)).difficulty).toBe(difficulty);
  });
  it('transpose only is mapped correctly', () => {
    const t = { digits: [1,2,3,4,5,6,7,8,9], rows: [0,1,2,3,4,5,6,7,8], cols: [0,1,2,3,4,5,6,7,8], transpose: true };
    const p = transformPuzzle(puzzle, t);
    expect(p.solution[1]).toBe(puzzle.solution[9]);
    expect(transformPuzzle(p, t)).toEqual(puzzle);
  });
});

describe('pure Sudoku editing rules', () => {
  it('clones initial arrays and has no prior edits', () => {
    const g = createGame(puzzle); expect(g.board).toEqual(puzzle.givens); expect(g.board).not.toBe(puzzle.givens); expect(g.history).toEqual([]);
  });
  it('all givens reject digits, notes and erasing without adding history', () => {
    const g = createGame(puzzle);
    for (let i = 0; i < 81; i++) if (puzzle.givens[i]) {
      expect(edit(g, i, 9)).toBe(g); expect(edit(g, i, 0)).toBe(g); expect(edit(g, i, 1, true)).toBe(g);
    }
  });
  it('digit input, overwrite, erasure and undo are immutable', () => {
    const original = createGame(puzzle), one = edit(original, emptyIndex, 1), two = edit(one, emptyIndex, 2), cleared = edit(two, emptyIndex, 0);
    expect(original.board[emptyIndex]).toBe(0); expect(cleared.board[emptyIndex]).toBe(0);
    expect(undo(cleared).board).toEqual(two.board); expect(undo(undo(cleared)).board).toEqual(one.board);
    expect(undo(undo(undo(cleared)))).toEqual(original);
  });
  it('notes toggle in sorted order; erase and undo recover the notes', () => {
    let g = edit(createGame(puzzle), emptyIndex, 8, true);
    g = edit(g, emptyIndex, 2, true); expect(g.notes[emptyIndex]).toEqual([2,8]);
    g = edit(g, emptyIndex, 8, true); expect(g.notes[emptyIndex]).toEqual([2]);
    const erased = edit(g, emptyIndex, 0); expect(erased.notes[emptyIndex]).toEqual([]);
    expect(undo(erased).notes[emptyIndex]).toEqual([2]);
    const filled = edit(g, emptyIndex, 6); expect(filled.notes[emptyIndex]).toEqual([]);
    expect(edit(filled, emptyIndex, 2, true)).toBe(filled);
  });
  it('no-op input does not consume undo', () => {
    const g = createGame(puzzle); expect(edit(g, emptyIndex, 0)).toBe(g); expect(undo(g)).toBe(g);
    const one = edit(g, emptyIndex, 3); expect(edit(one, emptyIndex, 3)).toBe(one);
  });
  for (const [index, digit] of [[-1,1],[81,1],[1.5,1],[0,-1],[0,10],[0,2.5],[NaN,1]]) it(`rejects invalid edit ${index}, ${digit}`, () => {
    const g = createGame(puzzle); expect(edit(g, index, digit)).toBe(g);
  });
  it('bounds undo memory while retaining the most recent edit', () => {
    let g = createGame(puzzle);
    for (let n = 0; n < 250; n++) g = edit(g, emptyIndex, n % 2 + 1);
    expect(g.history).toHaveLength(MAX_HISTORY); expect(undo(g).board[emptyIndex]).toBe(1);
  });
  it('restart through createGame restores exact puzzle with empty history/notes', () => {
    const g = edit(createGame(puzzle), emptyIndex, 4, true);
    expect(createGame(g.puzzle)).toEqual(createGame(puzzle));
  });
  for (const [name,a,b] of [['row',0,8],['column',0,72],['box',0,20]] as const) it(`reports both ${name} conflict participants`, () => {
    const board = Array(81).fill(0); board[a] = board[b] = 7;
    expect([...conflicts(board)]).toEqual([a,b]);
  });
  it('does not confuse neighboring rows/columns/boxes', () => {
    expect(peers(8,9)).toBe(false); expect(peers(20,30)).toBe(false);
    const board = Array(81).fill(0); board[8] = board[9] = 3; expect(conflicts(board).size).toBe(0);
  });
  it('wins only for complete legal digits, never notes or filled duplicates', () => {
    expect(isComplete(puzzle.givens)).toBe(false); expect(isComplete(puzzle.solution)).toBe(true);
    const almost = [...puzzle.solution]; almost[emptyIndex] = 0; expect(isComplete(almost)).toBe(false);
    const bad = [...puzzle.solution]; bad[0] = bad[1]; expect(isComplete(bad)).toBe(false);
    expect(isComplete(Array(81).fill(1))).toBe(false); expect(isComplete(Array(81).fill(10))).toBe(false);
    expect(isComplete(puzzle.solution.slice(1))).toBe(false);
  });
  it('actual final input produces completion and locks further edits', () => {
    const g = createGame(puzzle); g.board = [...puzzle.solution]; g.board[emptyIndex] = 0;
    const done = edit(g, emptyIndex, puzzle.solution[emptyIndex]); expect(isComplete(done.board)).toBe(true);
    expect(edit(done, emptyIndex, 0)).toBe(done); expect(undo(done)).toBe(done);
  });
});
