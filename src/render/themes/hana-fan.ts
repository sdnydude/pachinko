import type { Theme } from '../theme';
import { HANA_FAN_CEL } from '../cels/hana-fan';
import { svgDataUrl } from '../cel';
export const HANA_FAN_THEME: Theme = {
  id: 'hana-fan', name: '花扇 HANA FAN', celUrl: svgDataUrl(HANA_FAN_CEL),
  palette: {
    accent: '#d8352b', accent2: '#c9a24a', pin: '#e2be62', pinHi: '#fff8dc', jewel: '#d8352b', ball: '#ececec', ballHi: '#ffffff',
    reelBg: '#fff8dc', reelFg: '#3a1a0a', reelHit: '#b3261e', tulipWing: '#f4c542', tulipBody: '#e0574a',
    windmill: ['#e0574a', '#f4c542', '#3a8f5c', '#2f6f9f'],
    pocketWin: '#3a8f5c', pocketStart: '#b3261e', pocketOut: '#3a1a0a', attacker: '#5a2b12', attackerOpen: '#e0574a',
    lamps: ['#f4c542', '#e0574a', '#fff3c4'], panelBg: '#3f1d0b', panelFg: '#fff3c4', panelAccent: '#c9a24a', wall: '#2a1408',
  },
  fonts: { display: '"Rozha One", Georgia, serif', body: '"Noto Sans JP", system-ui, sans-serif', googleFamilies: ['Rozha+One', 'Noto+Sans+JP:wght@400;700'] },
  copy: { jackpot: '大当り FEVER', reach: 'リーチ REACH', rightShoot: '', start: 'START', fever: 'HANA', buyIn: 'BUY IN · 100 BALLS' },
  jewelEvery: 6,
};
