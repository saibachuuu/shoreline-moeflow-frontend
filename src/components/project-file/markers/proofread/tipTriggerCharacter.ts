import store from 'store';

/** 批注框触发字符的默认值 */
export const DEFAULT_TIP_TRIGGER_CHARACTER = '_';

const TIP_TRIGGER_CHARACTER_STORAGE_KEY = 'tipTriggerCharacter';

/** 合法的触发字符：单个非空白字符（排除空串、空白与 emoji 等多码元字符） */
export function isValidTipTriggerCharacter(char: unknown): char is string {
  return typeof char === 'string' && /^\S$/.test(char);
}

export function loadTipTriggerCharacter(): string {
  const stored = store.get(TIP_TRIGGER_CHARACTER_STORAGE_KEY, null);
  return isValidTipTriggerCharacter(stored)
    ? stored
    : DEFAULT_TIP_TRIGGER_CHARACTER;
}

export function saveTipTriggerCharacter(char: string): void {
  if (!isValidTipTriggerCharacter(char)) {
    return;
  }
  store.set(TIP_TRIGGER_CHARACTER_STORAGE_KEY, char);
}
