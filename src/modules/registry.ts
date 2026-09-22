import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FC } from 'react';

/**
 * 前端可选模块的**纯逻辑**部分。
 *
 * 这里刻意不出现 `import.meta.glob`——那是 Vite 的构建期 API，
 * 放在本文件里会让逻辑无法在 jest（commonjs）下测试。
 * 真正的目录扫描在 `./index.ts`，本文件只负责"从扫描结果里挑出合法模块"。
 *
 * 本文件**必须保持通用**：不得出现任何具体模块的名字。
 * （`docs/optional-modules.md` 的 C1 约束。）
 */

/** 模块贡献的菜单项。 */
export interface ModuleMenuItem {
  /** 展示文案（已翻译好的字符串）。 */
  name: string;
  /** 图标，与 `<Icon icon={...} />` 的取值一致（FontAwesome IconProp）。 */
  icon: IconProp;
  /** 绝对路径，须与模块声明的 route path 一致。 */
  path: string;
}

/** 模块贡献的路由。 */
export interface ModuleRoute {
  /** 相对于 dashboard 的路径，例如 `partner-search`。 */
  path: string;
  component: FC;
}

/**
 * 模块插入到「项目页顶部」的区块。
 *
 * 这是**通用插槽**，核心只知道"这里可以放东西"，不知道谁放、放什么。
 * 组件通过 props 拿到项目 id（核心的数据形状，不是模块的领域接口）。
 */
export interface ProjectTopSlot {
  component: FC<{ projectID: string }>;
}

/** 模块自述。 */
export interface FrontendModule {
  /** 模块标识，建议等于目录名。 */
  name: string;
  /** 菜单项；不提供则不显示菜单入口。 */
  menuItems?: ModuleMenuItem[];
  /** 挂在 dashboard 下的路由。 */
  routes?: ModuleRoute[];
  /** 插入项目页顶部的区块（按模块 name 排序渲染）。 */
  projectTopSlots?: ProjectTopSlot[];
}

/** 模块 `index.ts` 允许导出的形状：具名 `MODULE` 或默认导出。 */
export interface ModuleModuleShape {
  MODULE?: FrontendModule;
  default?: FrontendModule;
}

/**
 * 从 `import.meta.glob` 的结果中挑出合法的模块定义。
 *
 * 单个模块写坏（没导出 `FrontendModule`）时跳过并告警，而不是抛错——
 * 否则一个模块的笔误会让整个前端白屏。
 */
export function selectModules(
  found: Record<string, ModuleModuleShape | undefined>,
): FrontendModule[] {
  const modules: FrontendModule[] = [];
  for (const [path, shape] of Object.entries(found)) {
    const candidate = shape?.MODULE ?? shape?.default;
    if (!candidate || typeof candidate.name !== 'string') {
      // eslint-disable-next-line no-console
      console.warn(`[modules] ${path} 未导出合法的 FrontendModule，已跳过`);
      continue;
    }
    modules.push(candidate);
  }
  // 按 name 排序，保证菜单顺序稳定（不依赖文件系统的枚举顺序）。
  modules.sort((a, b) => a.name.localeCompare(b.name));
  return modules;
}

/** 从模块列表中取出所有菜单项。 */
export function collectMenuItems(
  modules: readonly FrontendModule[],
): ModuleMenuItem[] {
  return modules.flatMap((module) => module.menuItems ?? []);
}

/** 从模块列表中取出所有路由。 */
export function collectRoutes(
  modules: readonly FrontendModule[],
): ModuleRoute[] {
  return modules.flatMap((module) => module.routes ?? []);
}

/** 从模块列表中取出所有「项目页顶部」区块。 */
export function collectProjectTopSlots(
  modules: readonly FrontendModule[],
): ProjectTopSlot[] {
  return modules.flatMap((module) => module.projectTopSlots ?? []);
}