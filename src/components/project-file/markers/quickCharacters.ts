import store from 'store';
import { HotKeyOption } from '@/components/HotKey/interfaces';

export const QUICK_CHARACTERS = [
  '…',
  '～',
  '♡',
  '♥',
  '「',
  '」',
  '『',
  '』',
  '○',
  '●',
  '♪',
  '♩',
  '☆',
  '★',
  '■',
  '※',
  '·',
] as const;

export const DEFAULT_HOTKEY_CODES = [
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyZ',
  'KeyX',
  'KeyC',
  'KeyV',
] as const;

export const DEFAULT_DIGIT_CODES = DEFAULT_HOTKEY_CODES;

export interface QuickCharacterItem {
  character: string;
  hotKey?: HotKeyOption;
}

export const getDefaultQuickCharacterItems = (): QuickCharacterItem[] => {
  return QUICK_CHARACTERS.map((char, index) => {
    const key = DEFAULT_HOTKEY_CODES[index];
    return {
      character: char,
      hotKey: key
        ? {
            key,
            shift: false,
            ctrl: false,
            alt: true,
            meta: false,
            ignoreKeyboardElement: false,
          }
        : undefined,
    };
  });
};

export const QUICK_CHARACTERS_STORAGE_KEY = 'quickCharacterItems';

export function loadQuickCharacterItems(): QuickCharacterItem[] {
  const defaults = getDefaultQuickCharacterItems();
  const stored = store.get(QUICK_CHARACTERS_STORAGE_KEY, null);
  if (!Array.isArray(stored) || stored.length === 0) {
    return defaults;
  }
  return defaults.map((defaultItem, index) => {
    const saved = stored[index];
    if (!saved) return defaultItem;
    return {
      character:
        typeof saved.character === 'string'
          ? saved.character
          : defaultItem.character,
      hotKey: saved.hotKey !== undefined ? saved.hotKey : defaultItem.hotKey,
    };
  });
}

export function saveQuickCharacterItems(items: QuickCharacterItem[]): void {
  store.set(QUICK_CHARACTERS_STORAGE_KEY, items);
}

export function resetQuickCharacterItems(): QuickCharacterItem[] {
  const defaults = getDefaultQuickCharacterItems();
  store.set(QUICK_CHARACTERS_STORAGE_KEY, defaults);
  return defaults;
}

export interface InsertCharacterResult {
  value: string;
  cursor: number;
}

export function insertCharacterAtSelection(
  value: string,
  selectionStart: number | null,
  selectionEnd: number | null,
  character: string,
): InsertCharacterResult {
  const start = selectionStart ?? value.length;
  const end = selectionEnd ?? start;

  return {
    value: value.slice(0, start) + character + value.slice(end),
    cursor: start + character.length,
  };
}
