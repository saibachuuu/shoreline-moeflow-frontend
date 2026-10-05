import { calculateColumns } from './listLayout';
describe('responsive column counts', () => {
  test.each([280, 320, 375, 390])(
    'keeps two preview columns at %ipx',
    (width) => {
      expect(calculateColumns(width, 200, 2)).toBe(2);
    },
  );
  test('expands on wide screens and restores two columns on rotation', () => {
    expect(calculateColumns(850, 200, 2)).toBe(4);
    expect(calculateColumns(320, 200, 2)).toBe(2);
  });
  test('other lists retain a one-column minimum', () => {
    expect(calculateColumns(320, 200)).toBe(1);
  });
});
