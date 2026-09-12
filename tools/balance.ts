import { runSoak } from '../src/core/sim';
import { MACHINE_ORDER } from '../src/core/machine';

const strengths = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const rows: string[] = [];
rows.push(['machine', ...strengths.map(s => s.toFixed(1))].join('\t'));
for (const id of MACHINE_ORDER) {
  const cells = strengths.map(s => { const r = runSoak(id, { balls: 10000, strength: s, seed: 2026 }); return `${(r.returnRate * 100).toFixed(0)}%${r.jackpots ? ` (${r.jackpots}J)` : ''}`; });
  rows.push([id, ...cells].join('\t'));
}
console.log('Return rate outside jackpot (target 85–95% at the best strength):');
console.log(rows.join('\n'));
