// Independent test oracle: bitmask backtracking, stops as soon as a second solution is found.
// Deliberately does not import the product's peers/conflict/transform implementation.
export function solve(input: readonly number[]): { count: number; first: number[] | null } {
  if (input.length !== 81 || input.some(n => !Number.isInteger(n) || n < 0 || n > 9)) return { count: 0, first: null };
  const board = [...input], rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
  let count = 0; let first: number[] | null = null;
  for (let i = 0; i < 81; i++) {
    if (!board[i]) continue;
    const r = Math.floor(i / 9), c = i % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3), bit = 1 << board[i];
    if ((rows[r] | cols[c] | boxes[b]) & bit) return { count: 0, first: null };
    rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
  }
  function visit(): void {
    if (count >= 2) return;
    let index = -1, mask = 0, size = 10;
    for (let i = 0; i < 81; i++) {
      if (board[i]) continue;
      const r = Math.floor(i / 9), c = i % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      const possible = 0x3fe & ~(rows[r] | cols[c] | boxes[b]);
      let bits = possible, length = 0;
      while (bits) { bits &= bits - 1; length++; }
      if (!length) return;
      if (length < size) { index = i; mask = possible; size = length; }
      if (length === 1) break;
    }
    if (index === -1) { count++; first ??= [...board]; return; }
    const r = Math.floor(index / 9), c = index % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    for (let n = 1; n <= 9; n++) {
      const bit = 1 << n;
      if (!(mask & bit)) continue;
      board[index] = n; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      visit();
      board[index] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      if (count >= 2) return;
    }
  }
  visit(); return { count, first };
}
export function seeded(seed: number): () => number { return () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296); }
