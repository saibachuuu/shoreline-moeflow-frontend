import { formatBytes, KB, MB, SIZE_SCALE, sizeToColor, sizeToRatio } from './size';

describe('formatBytes', () => {
  it('formats human readable sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(KB)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(3 * MB)).toBe('3 MB');
    expect(formatBytes(12.4 * MB)).toBe('12.4 MB');
    expect(formatBytes(1024 * MB)).toBe('1 GB');
  });

  it('returns null for unknown input', () => {
    expect(formatBytes(null)).toBeNull();
    expect(formatBytes(undefined)).toBeNull();
    expect(formatBytes(Number.NaN)).toBeNull();
    expect(formatBytes(-1)).toBeNull();
  });
});

describe('sizeToRatio', () => {
  const scale = SIZE_SCALE.file;

  it('clamps at both ends', () => {
    expect(sizeToRatio(0, scale)).toBe(0);
    expect(sizeToRatio(scale.min, scale)).toBe(0);
    expect(sizeToRatio(scale.max, scale)).toBe(1);
    expect(sizeToRatio(scale.max * 10, scale)).toBe(1);
  });

  it('is monotonic and logarithmic in between', () => {
    const low = sizeToRatio(1 * MB, scale);
    const high = sizeToRatio(8 * MB, scale);
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThan(high);
    expect(high).toBeLessThan(1);
    // 线性映射下 3 MB 只到 (3-0.1)/(20-0.1) ≈ 15%，对数映射应明显更高
    expect(sizeToRatio(3 * MB, scale)).toBeGreaterThan(0.5);
  });
});

describe('sizeToColor', () => {
  const scale = SIZE_SCALE.project;

  it('is green at the low end and red at the high end', () => {
    expect(sizeToColor(scale.min, scale)).toBe('hsl(100.0, 65%, 45%)');
    expect(sizeToColor(scale.max, scale)).toBe('hsl(0.0, 65%, 45%)');
  });

  it('passes through yellow instead of muddy RGB midpoint', () => {
    const middle = sizeToColor(Math.sqrt(scale.min * scale.max), scale);
    const hue = Number(middle?.match(/hsl\(([\d.]+)/)?.[1]);
    expect(hue).toBeGreaterThan(45);
    expect(hue).toBeLessThan(55);
  });

  it('returns null for unknown or empty sizes so callers paint grey', () => {
    expect(sizeToColor(null, scale)).toBeNull();
    expect(sizeToColor(undefined, scale)).toBeNull();
    expect(sizeToColor(0, scale)).toBeNull();
  });

  it('brightens on dark theme', () => {
    expect(sizeToColor(scale.max, scale, true)).toContain('55%');
  });
});
