import type { MachineId } from '../../core/machine';
import type { Theme } from '../theme';
import { RAIJIN_THEME } from './raijin';
import { BIG_WAVE_THEME } from './big-wave';
import { HANA_FAN_THEME } from './hana-fan';
export const THEMES: Record<MachineId, Theme> = { raijin: RAIJIN_THEME, 'big-wave': BIG_WAVE_THEME, 'hana-fan': HANA_FAN_THEME };
