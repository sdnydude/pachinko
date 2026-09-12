export interface Rng {
  next(): number;                       // [0,1)
  int(n: number): number;               // [0,n)
  range(a: number, b: number): number;  // [a,b)
}

export function mulberry32(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (n) => Math.floor(next() * n), range: (a, b) => a + next() * (b - a) };
}
