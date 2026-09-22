import { FrontendModule } from '@/modules/registry';
import { ZitengCheckAlert } from './ZitengCheckAlert';

/**
 * 外组作品检索（紫藤合作方）模块。
 *
 * 本目录存在即启用——没有额外的开关，也不需要在核心注册任何东西。
 *
 * 本模块**不**贡献菜单项或路由：它的界面是项目页顶部的一条提示，
 * 通过通用的 `projectTopSlots` 插槽注入（见 `@/modules/registry`）。
 */
export const MODULE: FrontendModule = {
  name: 'ziteng_partner',
  projectTopSlots: [{ component: ZitengCheckAlert }],
};

export default MODULE;

export * from './api';
export * from './logic';