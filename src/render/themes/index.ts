import type { MachineId } from '../../core/machine';
import type { Theme } from '../theme';
import { RAIJIN_THEME } from './raijin';
// big-wave and hana-fan are added in Task 14; until then they alias raijin so the app boots.
export const THEMES: Record<MachineId, Theme> = {
  raijin: RAIJIN_THEME,
  'big-wave': { ...RAIJIN_THEME, id: 'big-wave', name: '大海 BIG WAVE' },
  'hana-fan': { ...RAIJIN_THEME, id: 'hana-fan', name: '花扇 HANA FAN' },
};
