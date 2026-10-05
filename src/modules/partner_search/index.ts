import type { FrontendModule } from '../registry';
import { Settings } from './Settings';
export const MODULE: FrontendModule = {
  name: 'partner_search',
  adminSettings: [Settings],
};
