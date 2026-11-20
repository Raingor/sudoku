import { describe, it, expect } from 'vitest';
import { BASE_PUZZLES } from '../src/puzzles';
import { createGame, edit } from '../src/engine';
import { emptySave, load, parseSave, persist, recordBest, STORAGE_KEY, type Save } from '../src/storage';
import { Clock, formatTime, MAX_ELAPSED } from '../src/clock';
const fixture = (): Save => ({ ...emptySave(), current: { game: edit(createGame(BASE_PUZZLES[0]), 0, 2, true), elapsedMs: 45000, selected: 0, noteMode: true } });

describe('versioned storage and hostile fields', () => {
  it('has the required isolated key', () => expect(STORAGE_KEY).toBe(['puzzle','sudoku','v1'].join('-')));
  it('roundtrips complete supported progress with notes and undo', () => {
    const save = fixture(); expect(parseSave(JSON.stringify(save))).toEqual(save);
  });
  for (const input of [null, '', '{broken', 'null', '[]', '{}', '{"version":2,"best":{}}', '{"version":1,"best":[]}']) it(`recovers from ${String(input)}`, () => expect(parseSave(input)).toEqual(emptySave()));
  for (const invalid of [-1, '12', false, 1.5, MAX_ELAPSED + 1, {}]) it(`rejects invalid record ${String(invalid)}`, () => {
    const save: any = fixture(); save.best.easy = invalid; expect(parseSave(JSON.stringify(save))).toEqual(emptySave());
  });
  it('caps input size', () => expect(parseSave(' '.repeat(1_000_001))).toEqual(emptySave()));
  const corruptions: [string, (s: any) => void][] = [
    ['board size', s => s.current.game.board.pop()],
    ['fractional board digit', s => s.current.game.board[0] = 0.5],
    ['overwriting given', s => s.current.game.board[1] = 9],
    ['notes type', s => s.current.game.notes[0] = '1'],
    ['duplicate notes', s => s.current.game.notes[0] = [2,2]],
    ['out of range note', s => s.current.game.notes[0] = [10]],
    ['notes in filled cell', s => s.current.game.notes[1] = [2]],
    ['unknown puzzle', s => s.current.game.puzzle.id = 'external'],
    ['difficulty mismatch', s => s.current.game.puzzle.difficulty = 'hard'],
    ['illegal solution', s => s.current.game.puzzle.solution[0] = 9],
    ['wrong givens', s => s.current.game.puzzle.givens[0] = 1],
    ['oversized undo', s => s.current.game.history = Array(201).fill({})],
    ['corrupt undo', s => s.current.game.history = [{ board: [], notes: [] }]],
    ['negative timer', s => s.current.elapsedMs = -1],
    ['huge timer', s => s.current.elapsedMs = MAX_ELAPSED + 1],
    ['invalid selection', s => s.current.selected = 81],
    ['invalid note mode', s => s.current.noteMode = 'yes'],
  ];
  for (const [name, mutate] of corruptions) it(`drops invalid current ${name} but preserves valid records`, () => {
    const save = fixture(); save.best.medium = 100; mutate(save);
    const loaded = parseSave(JSON.stringify(save)); expect(loaded.current).toBeNull(); expect(loaded.best.medium).toBe(100);
  });
  it('read and write failures degrade without throwing', () => {
    const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
    expect(load(blocked)).toEqual({ save: emptySave(), available: false }); expect(persist(blocked, fixture())).toBe(false);
  });
  it('writes versioned data to only the game key', () => {
    let key = '', value = ''; const storage = { getItem: () => value, setItem: (k: string, v: string) => { key = k; value = v; } };
    expect(persist(storage, fixture())).toBe(true); expect(key).toBe(STORAGE_KEY); expect(load(storage).save).toEqual(fixture());
  });
  it('records only a better time and isolates all three difficulty groups', () => {
    let best = recordBest(emptySave().best, 'easy', 1200.9); best = recordBest(best, 'medium', 5000);
    expect(recordBest(best, 'easy', 3000)).toEqual(best);
    expect(recordBest(best, 'easy', 1000)).toEqual({ easy: 1000, medium: 5000, hard: null });
    expect(recordBest(best, 'hard', 0).hard).toBe(0);
  });
});

describe('injected independent clock', () => {
  it('does not run until resumed; repeat resume never doubles time', () => {
    let now = 0; const clock = new Clock(2000, () => now); now = 1000; expect(clock.elapsed()).toBe(2000);
    clock.resume(); now = 1300; clock.resume(); now = 1600; expect(clock.elapsed()).toBe(2600);
  });
  it('pause and resume exclude hidden/dialog time and pause is idempotent', () => {
    let now = 0; const clock = new Clock(0, () => now); clock.resume(); now = 1234; clock.pause(); clock.pause(); now = 8000;
    expect(clock.elapsed()).toBe(1234); clock.resume(); now = 8500; expect(clock.elapsed()).toBe(1734);
  });
  it('reset clears any running anchor and supports restoring a saved duration', () => {
    let now = 0; const clock = new Clock(0, () => now); clock.resume(); now = 4000; clock.reset(12000); now = 9000;
    expect(clock.elapsed()).toBe(12000); clock.resume(); now = 10000; expect(clock.elapsed()).toBe(13000);
  });
  it('clamps backwards and excessive time', () => {
    let now = 100; const clock = new Clock(MAX_ELAPSED - 1, () => now); clock.resume(); now = 90; expect(clock.elapsed()).toBe(MAX_ELAPSED - 1);
    now = MAX_ELAPSED; expect(clock.elapsed()).toBe(MAX_ELAPSED);
  });
  it('formats minutes and hours without losing hour digits', () => {
    expect(formatTime(999)).toBe('00:00'); expect(formatTime(65000)).toBe('01:05'); expect(formatTime(3661000)).toBe('1:01:01');
  });
});
