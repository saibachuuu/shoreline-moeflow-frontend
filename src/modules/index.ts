import {
  collectMenuItems,
  collectProjectTopSlots,
  collectRoutes,
  FrontendModule,
  ModuleModuleShape,
  selectModules,
} from './registry';

/**
 * 前端可选模块的**目录扫描**入口。
 *
 * 本文件只做一件事：用 Vite 的 `import.meta.glob` 扫描模块目录，
 * 然后把结果交给 `./registry.ts` 的纯逻辑处理。
 *
 * 模块 = 各模块目录下的 `index.ts` 存在，且导出 `MODULE`（或默认导出）
 * 一个 `FrontendModule`。目录即启用，没有别的开关。
 *
 * 本文件**必须保持通用**：不得出现任何具体模块的名字。
 * （`docs/optional-modules.md` 的 C1 约束。）
 *
 * `eager: true` 让 Vite 在构建期静态解析，因此零模块时得到的就是一个空对象，
 * 构建产物与引入本机制之前完全一致（§4 检查项 8/9）。
 */

const found = import.meta.glob('./*/index.ts', {
  eager: true,
}) as Record<string, ModuleModuleShape | undefined>;

/** 所有已启用的前端模块。 */
export const enabledModules: FrontendModule[] = selectModules(found);

/** 所有模块贡献的菜单项。 */
export const moduleMenuItems = collectMenuItems(enabledModules);

/** 所有模块贡献的路由。 */
export const moduleRoutes = collectRoutes(enabledModules);

/** 所有模块插入「项目页顶部」的区块。 */
export const moduleProjectTopSlots = collectProjectTopSlots(enabledModules);

export * from './registry';
