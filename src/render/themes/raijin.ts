import type { Theme } from '../theme';
import { RAIJIN_CEL } from '../cels/raijin';
import { svgDataUrl } from '../cel';
export const RAIJIN_THEME: Theme = {
  id: 'raijin', name: '雷神 RAIJIN', shortName: 'RAIJIN', celUrl: svgDataUrl(RAIJIN_CEL),
  palette: {
    accent: '#ffe600', accent2: '#c9302c', pin: '#d4a017', pinHi: '#fff0a8', jewel: '#ff3b3b', ball: '#f0f0f0', ballHi: '#ffffff',
    reelBg: '#fff3e0', reelFg: '#111111', reelHit: '#c9302c', tulipWing: '#d4a017', tulipBody: '#c9302c',
    windmill: ['#c9302c', '#d4a017', '#fff3e0', '#111111'],
    pocketWin: '#d4a017', pocketStart: '#c9302c', pocketOut: '#1a0a0a', attacker: '#5a1010', attackerOpen: '#ff3b3b',
    lamps: ['#ffe600', '#c9302c', '#fff0a8', '#ff3b3b'], panelBg: '#1a0606', panelFg: '#fff3e0', panelAccent: '#d4a017', wall: '#2a0404',
  },
  fonts: { display: '"Anton", Impact, "Arial Black", sans-serif', body: '"Noto Sans JP", system-ui, sans-serif', googleFamilies: ['Anton', 'Noto+Sans+JP:wght@400;700'] },
  copy: { jackpot: '大当り JACKPOT', reach: '激アツ REACH', rightShoot: '右打ち →', start: 'START', fever: 'THUNDER', buyIn: 'BUY IN · 100 BALLS' },
  jewelEvery: 5,
};
