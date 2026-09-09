import store from 'store';
import { getHotKeyDisplayName } from '@/components/HotKey/utils';
import {
  DEFAULT_HOTKEY_CODES,
  getDefaultQuickCharacterItems,
  insertCharacterAtSelection,
  loadQuickCharacterItems,
  QUICK_CHARACTERS,
  QUICK_CHARACTERS_STORAGE_KEY,
  resetQuickCharacterItems,
  saveQuickCharacterItems,
} from './quickCharacters';
describe('quick characters', () => {
  it('keeps the configured character set', () => {
    expect(QUICK_CHARACTERS).toEqual(
      expect.arrayContaining(['…', '「', '」', '♪', '※']),
    );
  });

  it('inserts a character at the cursor', () => {
    expect(insertCharacterAtSelection('hello', 2, 2, '♡')).toEqual({
      value: 'he♡llo',
      cursor: 3,
    });
  });

  it('replaces the selected range and appends without a selection', () => {
    expect(insertCharacterAtSelection('hello', 1, 4, '～')).toEqual({
      value: 'h～o',
      cursor: 2,
    });
    expect(insertCharacterAtSelection('hello', null, null, '♪')).toEqual({
      value: 'hello♪',
      cursor: 6,
    });
  });

  it('configures default quick character items and hotkeys correctly', () => {
    const items = getDefaultQuickCharacterItems();
    expect(items.length).toBe(QUICK_CHARACTERS.length);
    expect(DEFAULT_HOTKEY_CODES).toEqual([
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
    ]);

    const expectedKeys = [
      'Q',
      'W',
      'E',
      'R',
      'A',
      'S',
      'D',
      'F',
      'Z',
      'X',
      'C',
      'V',
    ];

    // First 12 items have Alt + Q/W/E/R/A/S/D/F/Z/X/C/V
    for (let i = 0; i < 12; i++) {
      expect(items[i].character).toBe(QUICK_CHARACTERS[i]);
      expect(items[i].hotKey).toEqual({
        key: DEFAULT_HOTKEY_CODES[i],
        shift: false,
        ctrl: false,
        alt: true,
        meta: false,
        ignoreKeyboardElement: false,
      });
      expect(getHotKeyDisplayName(items[i].hotKey!)).toBe(`Alt+${expectedKeys[i]}`);
    }

    // Items 12 and beyond have no default hotkey
    for (let i = 12; i < items.length; i++) {
      expect(items[i].character).toBe(QUICK_CHARACTERS[i]);
      expect(items[i].hotKey).toBeUndefined();
    }
  });

  it('handles loading, saving, and resetting quick characters', () => {
    store.remove(QUICK_CHARACTERS_STORAGE_KEY);
    const loadedDefault = loadQuickCharacterItems();
    expect(loadedDefault).toEqual(getDefaultQuickCharacterItems());

    // Modify symbols and hotkeys
    const modified = [...loadedDefault];
    modified[0] = {
      character: '—',
      hotKey: {
        key: 'Digit1',
        shift: true,
        ctrl: false,
        alt: false,
        meta: false,
        ignoreKeyboardElement: false,
      },
    };
    modified[10] = {
      character: '✨',
      hotKey: {
        key: 'KeyQ',
        shift: true,
        ctrl: true,
        alt: false,
        meta: false,
        ignoreKeyboardElement: false,
      },
    };
    saveQuickCharacterItems(modified);

    const reloaded = loadQuickCharacterItems();
    expect(reloaded[0].character).toBe('—');
    expect(reloaded[10].character).toBe('✨');
    expect(reloaded[10].hotKey?.key).toBe('KeyQ');

    // Reset to defaults
    const resetted = resetQuickCharacterItems();
    expect(resetted[0].character).toBe(QUICK_CHARACTERS[0]);
    expect(resetted[10].character).toBe(QUICK_CHARACTERS[10]);
    expect(resetted[10].hotKey?.key).toBe('KeyC');
    expect(resetted[12].hotKey).toBeUndefined();
  });
});
