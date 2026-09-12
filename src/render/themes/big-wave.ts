import type { Theme } from '../theme';
import { BIG_WAVE_CEL } from '../cels/big-wave';
import { svgDataUrl } from '../cel';
export const BIG_WAVE_THEME: Theme = {
  id: 'big-wave', name: '大海 BIG WAVE', celUrl: svgDataUrl(BIG_WAVE_CEL),
  palette: {
    accent: '#ffd23f', accent2: '#ff2fa0', pin: '#f0d060', pinHi: '#ffffff', jewel: '#ff2fa0', ball: '#f4fbff', ballHi: '#ffffff',
    reelBg: '#ffffff', reelFg: '#0b3d8a', reelHit: '#ff2fa0', tulipWing: '#22e6ff', tulipBody: '#0b3d8a',
    windmill: ['#ff2fa0', '#22e6ff', '#ffe600', '#7dff4a'],
    pocketWin: '#22e6ff', pocketStart: '#ff2fa0', pocketOut: '#061a3a', attacker: '#4a1030', attackerOpen: '#ff2fa0',
    lamps: ['#ff2fa0', '#22e6ff', '#ffe600', '#7dff4a'], panelBg: '#061a3a', panelFg: '#e8f7ff', panelAccent: '#ffd23f', wall: '#04101f',
  },
  fonts: { display: '"Bangers", Impact, "Arial Black", sans-serif', body: '"Noto Sans JP", system-ui, sans-serif', googleFamilies: ['Bangers', 'Noto+Sans+JP:wght@400;700'] },
  copy: { jackpot: '大当り FEVER', reach: 'リーチ!! REACH', rightShoot: '右打ち → SHOOT RIGHT', start: 'START', fever: 'BIG WAVE', buyIn: 'BUY IN · 100 BALLS' },
  jewelEvery: 5,
};
