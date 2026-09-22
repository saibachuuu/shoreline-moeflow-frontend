import fsp from 'node:fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const assetDir = path.join(__dirname, '../src/locales');
const messageYaml = path.join(assetDir, 'messages.yaml');
const modulesDir = path.join(__dirname, '../src/modules');

/**
 * yield [path, message] pairs
 */
function* extractPathedMessages(obj: object, locale: string, pathPrefix: readonly string[] = []): Generator<[string, string]> {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value) {
      yield* extractPathedMessages(value, locale, [...pathPrefix, key]);
    } else if (typeof value === 'string') {
      if (key === locale) yield [pathPrefix.join('.'), value];
    } else {
      throw new Error(`unexpected value type at ${[...pathPrefix, key].join('.')}: ${typeof value}`);
    }
  }
}

/**
 * 收集可选模块自带的文案。
 *
 * 模块的 `src/modules/<name>/locales/messages.yaml` 与核心 messages.yaml
 * 结构相同。合并进产物，因此**核心 messages.yaml 不需要出现任何模块文案**
 * (docs/optional-modules.md §4 检查项 10)。
 * 零模块时返回空数组，产物与引入本机制前完全一致。
 */
async function loadModuleMessages(): Promise<{ name: string; messages: Record<string, Record<string, string>> }[]> {
  let entries: string[] = [];
  try {
    entries = await fsp.readdir(modulesDir);
  } catch {
    return []; // 没有 modules 目录：零模块
  }
  const result: { name: string; messages: Record<string, Record<string, string>> }[] = [];
  for (const name of entries.sort()) {
    const file = path.join(modulesDir, name, 'locales', 'messages.yaml');
    try {
      await fsp.access(file);
    } catch {
      continue; // 该模块没有自带文案
    }
    const messages = yaml.load(await fsp.readFile(file, { encoding: 'utf-8' })) as Record<string, Record<string, string>>;
    result.push({ name, messages });
  }
  return result;
}

const lang2Basename = Object.entries({
    zhCn: 'zh-cn.json',
    en: 'en.json',
})

setTimeout(async function main() {
  /**
   * key => locale => message
   * */
  const messages = yaml.load(
    await fsp.readFile(messageYaml, { encoding: 'utf-8' }),
  ) as Record<string, Record<string, string>>;

  const moduleMessages = await loadModuleMessages();

  const path2count: Record<string, number> = {};
  for (const [locale, basename] of lang2Basename ) {
    /**
     * key => message
     */
    const value: Record<string, string> = {};
    for(const [path, msg] of extractPathedMessages(messages, locale)) {
      path2count[path] = (path2count[path] ?? 0) + 1;
      value[path] = msg;
    }
    // 模块文案：模块条目与核心条目冲突时报错，避免静默覆盖
    for (const { name, messages: moduleMessagesById } of moduleMessages) {
      for (const [path, msg] of extractPathedMessages(moduleMessagesById, locale)) {
        if (path in value) {
          throw new Error(`模块 ${name} 的文案键与核心冲突: ${path}`);
        }
        path2count[path] = (path2count[path] ?? 0) + 1;
        value[path] = msg;
      }
    }
    const dest = path.join(assetDir, basename);
    await fsp.writeFile(dest, JSON.stringify(value, null, 2));
    console.info(`written to ${dest}`);
  }
});