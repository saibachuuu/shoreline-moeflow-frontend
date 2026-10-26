import type { FrontendModule } from '../registry';
import { getIntl } from '@/locales';
import { StoragePoolPage } from './StoragePoolPage';

/**
 * 存储池管理。目录存在即启用。
 *
 * 菜单名在模块加载时取一次当前语言；`getIntl()` 在 i18n 初始化之前返回 null，
 * 因此这里做了兜底，避免模块加载顺序影响整个前端。
 */
function t(id: string, fallback: string): string {
  try {
    return getIntl()?.formatMessage({ id }) ?? fallback;
  } catch {
    return fallback;
  }
}

export const MODULE: FrontendModule = {
  name: 'storage_pool',
  menuItems: [
    {
      name: t('storagePool.menuTitle', '存储池'),
      icon: 'cloud',
      path: '/dashboard/storage-pool',
    },
  ],
  routes: [{ path: 'storage-pool', component: StoragePoolPage }],
};

export default MODULE;
