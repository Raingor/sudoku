export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = typeof DIFFICULTIES[number];
export const LABELS: Record<Difficulty, string> = { easy: '入门', medium: '进阶', hard: '挑战' };
export interface Puzzle { id: string; difficulty: Difficulty; givens: number[]; solution: number[] }
const parse = (text: string) => [...text].map(Number);
// Original, algorithmically built offline with scripts/generate-puzzles.mjs, seed 20261120.
// These are library groups, not a claim of a mathematically certified human difficulty.
export const BASE_PUZZLES: readonly Puzzle[] = [
  ['easy-1', 'easy', '020080106670520089983000005706005010200009007809046032457392060392100754100000090', '524983176671524389983671425746235918235819647819746532457392861392168754168457293'],
  ['easy-2', 'easy', '006357981057901040981006000104025008020730090700004620003000412809402003400063809', '246357981357981246981246357194625738625738194738194625563879412879412563412563879'],
  ['medium-1', 'medium', '095010000003650000471008500052000008830020010700040000300502000028090743069304020', '695417382283659174471238596952761438834925617716843259347582961528196743169374825'],
  ['medium-2', 'medium', '050070810400981000100003040004800000063040050081032090732098061010027000000006003', '356274819427981635198563742974815326263749158581632497732498561615327984849156273'],
  ['hard-1', 'hard', '007080000000070920290000130000060301846005000500000000900536000172000000000000090', '317982645465173928298654137729468351846315279531297486984536712172849563653721894'],
  ['hard-2', 'hard', '074000000520160000609700208000007040930500001050000090000000475003000000000820000', '374258169528169734619734258861397542937542681452681397286913475193475826745826913'],
].map(([id, difficulty, givens, solution]) => ({ id, difficulty: difficulty as Difficulty, givens: parse(givens), solution: parse(solution) }));

export interface Transform { digits: number[]; rows: number[]; cols: number[]; transpose: boolean }
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeTransform(random: () => number): Transform {
  const groups = () => shuffle([0, 1, 2], random).flatMap(g => shuffle([0, 1, 2], random).map(n => g * 3 + n));
  return { digits: shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random), rows: groups(), cols: groups(), transpose: random() < 0.5 };
}
export function transformPuzzle(puzzle: Puzzle, t: Transform): Puzzle {
  const apply = (grid: number[]) => Array.from({ length: 81 }, (_, i) => {
    let r = Math.floor(i / 9), c = i % 9;
    if (t.transpose) [r, c] = [c, r];
    const n = grid[t.rows[r] * 9 + t.cols[c]];
    return n === 0 ? 0 : t.digits[n - 1];
  });
  return { ...puzzle, givens: apply(puzzle.givens), solution: apply(puzzle.solution) };
}
export function newPuzzle(difficulty: Difficulty, random: () => number = Math.random): Puzzle {
  const pool = BASE_PUZZLES.filter(p => p.difficulty === difficulty);
  return transformPuzzle(pool[Math.floor(random() * pool.length)], makeTransform(random));
}
