/**
 * 前端可选模块注册表的测试。
 *
 * 覆盖 `docs/optional-modules.md` §4 中与前端相关的验收项：
 * 零模块时注册表为空、契约的失败隔离、以及"注册表本身保持通用"的反向检查。
 *
 * 逻辑测试针对 `./registry`（纯函数，无 `import.meta`）；
 * `./index.ts` 因为含 Vite 的构建期 API，只在文本层面做 C1 反向检查。
 */

import fs from 'fs';
import path from 'path';

import {
  collectMenuItems,
  collectProjectSearchUnderSlots,
  collectProjectTopSlots,
  collectRoutes,
  FrontendModule,
  selectModules,
} from './registry';

const SRC_MODULES_DIR = path.resolve(__dirname);

const demoModule: FrontendModule = {
  name: 'demo',
  menuItems: [{ name: 'Demo', icon: 'book' as never, path: '/dashboard/demo' }],
  routes: [{ path: 'demo', component: (() => null) as never }],
};

describe('selectModules', () => {
  it('空扫描结果返回空数组（零模块）', () => {
    expect(selectModules({})).toEqual([]);
  });

  it('接受具名导出 MODULE', () => {
    const result = selectModules({ './demo/index.ts': { MODULE: demoModule } });
    expect(result).toEqual([demoModule]);
  });

  it('接受默认导出', () => {
    const result = selectModules({
      './demo/index.ts': { default: demoModule },
    });
    expect(result).toEqual([demoModule]);
  });

  it('具名导出优先于默认导出', () => {
    const other: FrontendModule = { name: 'other' };
    const result = selectModules({
      './demo/index.ts': { MODULE: demoModule, default: other },
    });
    expect(result.map((m) => m.name)).toEqual(['demo']);
  });

  it('跳过没有导出的条目，而不是抛错', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      const result = selectModules({
        './empty/index.ts': {},
        './demo/index.ts': { MODULE: demoModule },
      });
      expect(result.map((m) => m.name)).toEqual(['demo']);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('跳过 name 非字符串的非法模块', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      const result = selectModules({
        './bad/index.ts': { MODULE: { name: 123 } as never },
        './demo/index.ts': { MODULE: demoModule },
      });
      expect(result.map((m) => m.name)).toEqual(['demo']);
    } finally {
      warn.mockRestore();
    }
  });

  it('按 name 排序，顺序稳定', () => {
    const result = selectModules({
      './z/index.ts': { MODULE: { name: 'zeta' } },
      './a/index.ts': { MODULE: { name: 'alpha' } },
      './m/index.ts': { MODULE: { name: 'mid' } },
    });
    expect(result.map((m) => m.name)).toEqual(['alpha', 'mid', 'zeta']);
  });
});

describe('collectMenuItems / collectRoutes', () => {
  it('空模块列表产出空数组', () => {
    expect(collectMenuItems([])).toEqual([]);
    expect(collectRoutes([])).toEqual([]);
  });

  it('只提供 name 的模块不贡献菜单或路由', () => {
    expect(collectMenuItems([{ name: 'bare' }])).toEqual([]);
    expect(collectRoutes([{ name: 'bare' }])).toEqual([]);
  });

  it('合并多个模块的贡献', () => {
    const a: FrontendModule = {
      name: 'a',
      menuItems: [{ name: 'A', icon: 'book' as never, path: '/a' }],
    };
    const b: FrontendModule = {
      name: 'b',
      routes: [{ path: 'b', component: (() => null) as never }],
    };
    expect(collectMenuItems([a, b])).toHaveLength(1);
    expect(collectRoutes([a, b])).toHaveLength(1);
  });

  it('只提供 name 的模块不贡献顶部插槽', () => {
    expect(collectProjectTopSlots([{ name: 'bare' }])).toEqual([]);
  });

  it('收集项目页顶部插槽', () => {
    const slot = { component: (() => null) as never };
    expect(
      collectProjectTopSlots([{ name: 'a', projectTopSlots: [slot] }]),
    ).toHaveLength(1);
    expect(
      collectProjectTopSlots([
        { name: 'a', projectTopSlots: [slot] },
        { name: 'b', projectTopSlots: [slot, slot] },
      ]),
    ).toHaveLength(3);
  });

  it('只提供 name 的模块不贡献搜索框下方插槽', () => {
    expect(collectProjectSearchUnderSlots([{ name: 'bare' }])).toEqual([]);
  });

  it('收集项目文件搜索框下方插槽', () => {
    const slot = { component: (() => null) as never };
    expect(
      collectProjectSearchUnderSlots([
        { name: 'a', projectSearchUnderSlots: [slot] },
      ]),
    ).toHaveLength(1);
    expect(
      collectProjectSearchUnderSlots([
        { name: 'a', projectSearchUnderSlots: [slot] },
        { name: 'b', projectSearchUnderSlots: [slot, slot] },
      ]),
    ).toHaveLength(3);
  });
});

describe('模块目录约定', () => {
  it('每个模块子目录都有 index.ts（否则 import.meta.glob 扫不到）', () => {
    // 目录存在即启用，但入口必须是 index.ts——否则表面"装了"实际不生效。
    const dirs = fs
      .readdirSync(SRC_MODULES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const missing = dirs.filter(
      (dir) => !fs.existsSync(path.join(SRC_MODULES_DIR, dir, 'index.ts')),
    );
    expect(missing).toEqual([]);
  });

  it('模块目录名与其 MODULE.name 一致', () => {
    const dirs = fs
      .readdirSync(SRC_MODULES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const mismatched: string[] = [];
    for (const dir of dirs) {
      const source = fs.readFileSync(
        path.join(SRC_MODULES_DIR, dir, 'index.ts'),
        'utf-8',
      );
      if (!source.includes(`name: '${dir}'`)) {
        mismatched.push(dir);
      }
    }
    expect(mismatched).toEqual([]);
  });
});

describe('注册表保持通用（C1 反向检查）', () => {
  const knownModuleNames = [
    'archive_import',
    'archiveImport',
    'ziteng',
    'partnerSearch',
    'partner_search',
  ];

  for (const file of ['index.ts', 'registry.ts']) {
    it(`${file} 不出现任何具体模块名`, () => {
      const source = fs.readFileSync(path.join(SRC_MODULES_DIR, file), 'utf-8');
      for (const name of knownModuleNames) {
        expect(source).not.toContain(name);
      }
    });
  }

  it('index.ts 使用 import.meta.glob 扫描模块目录', () => {
    const source = fs.readFileSync(
      path.join(SRC_MODULES_DIR, 'index.ts'),
      'utf-8',
    );
    expect(source).toContain('import.meta.glob');
    expect(source).toContain('eager: true');
  });
});

describe('文案生成与模块目录保持一致', () => {
  const LOCALES_DIR = path.join(__dirname, '../locales');
  const MESSAGES_YAML = fs.readFileSync(
    path.join(LOCALES_DIR, 'messages.yaml'),
    'utf-8',
  );

  it('build 前会自动重新生成文案（否则删掉模块后会残留文案）', () => {
    // src/locales/*.json 是**生成产物**且被提交。
    // 若不随 build 重新生成，删掉模块目录后模块文案会留在产物里，
    // 「目录即开关」就只对了一半。
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'),
    );
    expect(pkg.scripts.prebuild).toBeDefined();
    expect(pkg.scripts.prebuild).toContain('build:locale');
  });

  it('核心 messages.yaml 不含本模块的文案（§4 检查项 10）', () => {
    // 只检查**已经模块化**的文案。partnerSearch/archiveImport 尚未迁成模块，
    // 它们的文案留在核心是预期的（见 docs/optional-modules.md §5、§7），
    // 因此不在这里断言——否则测试会为一件已知的待办而失败。
    expect(MESSAGES_YAML).not.toContain('ziteng');
    expect(MESSAGES_YAML).not.toContain('zitengChecking');
  });

  it('模块文案目录结构与生成器的约定一致', () => {
    // 生成器读 src/modules/<name>/locales/messages.yaml
    //
    // ⚠️ 这里断言的是**不变式**：凡是自带文案的目录，路径都必须恰好是
    // `locales/messages.yaml`（生成器认这一条）。**不能**断言「至少有一个模块
    // 自带文案」——那会让「零模块」这一合法状态把测试弄红，
    // 与「目录即开关」自相矛盾。
    const dirs = fs
      .readdirSync(SRC_MODULES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const misplaced: string[] = [];
    for (const dir of dirs) {
      const localesDir = path.join(SRC_MODULES_DIR, dir, 'locales');
      if (!fs.existsSync(localesDir)) continue; // 该模块没有文案，合法
      // 有 locales/ 就必须有 messages.yaml，否则生成器读不到、静默丢文案
      if (!fs.existsSync(path.join(localesDir, 'messages.yaml'))) {
        misplaced.push(dir);
      }
    }
    expect(misplaced).toEqual([]);
  });
});

describe('前端模块契约', () => {
  it('FrontendModule 允许只提供 name', () => {
    const mod: FrontendModule = { name: 'demo' };
    expect(mod.name).toBe('demo');
    expect(mod.menuItems).toBeUndefined();
    expect(mod.routes).toBeUndefined();
  });
});
