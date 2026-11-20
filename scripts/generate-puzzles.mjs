// Original offline construction. Bounded greedy deletion, never used by the app.
// Output is reviewed and copied into src/puzzles.ts. No downloaded puzzle data.
let seed = 20261120;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const shuffled = xs => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
function countSolutions(input) {
  const a = [...input]; let count = 0;
  function visit() {
    if (count >= 2) return;
    let best = -1, choices = [];
    for (let i = 0; i < 81; i++) {
      if (a[i]) continue;
      const r = Math.floor(i / 9), c = i % 9;
      const opts = [1,2,3,4,5,6,7,8,9].filter(n => {
        for (let k = 0; k < 9; k++) {
          if (a[r * 9 + k] === n || a[k * 9 + c] === n || a[(Math.floor(r / 3) * 3 + Math.floor(k / 3)) * 9 + Math.floor(c / 3) * 3 + k % 3] === n) return false;
        }
        return true;
      });
      if (!opts.length) return;
      if (best === -1 || opts.length < choices.length) { best = i; choices = opts; }
    }
    if (best === -1) { count++; return; }
    for (const n of choices) { a[best] = n; visit(); if (count >= 2) break; }
    a[best] = 0;
  }
  visit(); return count;
}
for (const [difficulty, target] of [['easy',43], ['medium',34], ['hard',25]]) {
  for (let variant = 1; variant <= 2; variant++) {
    const digits = shuffled([1,2,3,4,5,6,7,8,9]);
    const rows = shuffled([0,1,2]).flatMap(b => shuffled([0,1,2]).map(r => b * 3 + r));
    const cols = shuffled([0,1,2]).flatMap(b => shuffled([0,1,2]).map(c => b * 3 + c));
    const solution = rows.flatMap(r => cols.map(c => digits[(r * 3 + Math.floor(r / 3) + c) % 9]));
    const givens = [...solution]; let clues = 81;
    for (const i of shuffled([...Array(81).keys()])) {
      if (clues <= target) break;
      const old = givens[i]; givens[i] = 0;
      if (countSolutions(givens) === 1) clues--; else givens[i] = old;
    }
    console.log(JSON.stringify({ id: `${difficulty}-${variant}`, difficulty, givens: givens.join(''), solution: solution.join(''), clues }));
  }
}
