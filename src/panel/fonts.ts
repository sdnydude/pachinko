import type { Theme } from '../render/theme';
const loaded = new Set<string>();
export function ensureFonts(theme: Theme): void {
  for (const fam of theme.fonts.googleFamilies) {
    if (loaded.has(fam)) continue; loaded.add(fam);
    const link = document.createElement('link'); link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
    document.head.appendChild(link);
  }
}
