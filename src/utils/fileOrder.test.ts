import { moveFile, sortFilesByIds } from './fileOrder';

describe('manual file order', () => {
  test('moves down without swapping intervening images', () => {
    const files = ['a', 'b', 'c', 'd'];
    expect(moveFile(files, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(files).toEqual(['a', 'b', 'c', 'd']);
  });
  test('moves up and to either edge', () => {
    expect(moveFile(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveFile(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });
  test('ignores invalid, stale and unchanged positions', () => {
    for (const [from, to] of [
      [-1, 0],
      [0, -1],
      [3, 0],
      [0, 3],
      [1, 1],
      [0, 1.5],
    ] as [number, number][]) {
      expect(moveFile(['a', 'b', 'c'], from, to)).toEqual(['a', 'b', 'c']);
    }
    expect(moveFile([], 0, 0)).toEqual([]);
  });
});

describe('automatic file order', () => {
  test('uses backend order rather than browser string sorting and preserves objects', () => {
    const files = [
      { id: '10', name: '10.png' },
      { id: '2', name: '2.png' },
      { id: '1', name: '1.png' },
    ];
    const result = sortFilesByIds(files, ['1', '2', '10']);
    expect(result.map((file) => file.name)).toEqual([
      '1.png',
      '2.png',
      '10.png',
    ]);
    expect(result[0]).toBe(files[2]);
    expect(files.map((file) => file.id)).toEqual(['10', '2', '1']);
  });
  test('does not drop files absent from an outdated order map', () => {
    expect(sortFilesByIds([{ id: 'new' }, { id: 'old' }], ['old'])).toEqual([
      { id: 'old' },
      { id: 'new' },
    ]);
    expect(sortFilesByIds([], [])).toEqual([]);
  });
});
