import {
  insertCharacterAtSelection,
  QUICK_CHARACTERS,
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
});
