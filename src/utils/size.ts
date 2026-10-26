/** 容量阈值与配色：把字节数映射成 0–1 的比值和一个颜色。纯函数，好测。 */

export const KB = 1024;
export const MB = 1024 * KB;
export const GB = 1024 * MB;

export interface SizeScale {
  min: number;
  max: number;
}

/**
 * 两套预设阈值。
 *
 * 文件级：漫画单页多在 1–8 MB，100 KB 以下算小、20 MB 以上算大。
 * 项目级：几十 MB 到几 GB，20 MB 以下算小、400 MB 以上算大 —— 红是「该关注了」
 * 的视觉编码，项目普遍超 400 MB 是预期内的，不是配色出错。
 */
export const SIZE_SCALE = {
  file: { min: 100 * KB, max: 20 * MB },
  project: { min: 20 * MB, max: 400 * MB },
} as const;

export type SizeScaleName = keyof typeof SIZE_SCALE;

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** 字节数 → 「12.4 GB」。非法输入返回 null，交给调用方决定怎么显示。 */
export const formatBytes = (bytes?: number | null): string | null => {
  if (bytes === null || bytes === undefined) {
    return null;
  }
  if (!Number.isFinite(bytes) || bytes < 0) {
    return null;
  }
  if (bytes < KB) {
    return `${Math.round(bytes)} B`;
  }
  let value = bytes;
  let index = 0;
  while (value >= KB && index < UNITS.length - 1) {
    value /= KB;
    index += 1;
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  let text = value.toFixed(digits);
  // 去掉「1.00 MB」这种没有信息量的尾零
  if (text.includes('.')) {
    text = text.replace(/0+$/, '').replace(/\.$/, '');
  }
  return `${text} ${UNITS[index]}`;
};

/**
 * 字节数 → 0–1。用对数映射：线性映射会把 60 MB 的项目压到 10%，和 25 MB
 * 看不出区别，而真实体积分布是长尾的。两端仍严格 0 / 1。
 */
export const sizeToRatio = (bytes: number, scale: SizeScale): number => {
  if (!Number.isFinite(bytes) || bytes <= scale.min) {
    return 0;
  }
  if (bytes >= scale.max) {
    return 1;
  }
  return Math.log(bytes / scale.min) / Math.log(scale.max / scale.min);
};

/**
 * 字节数 → 颜色。用 HSL 只推色相（100° 绿 → 0° 红），天然经过黄与橙；
 * 直接对 RGB 插值的中点是 #A88934 的土黄，看着像褪色而不是过渡。
 *
 * 未知或 0 返回 null —— 调用方画灰色描边，绝不涂绿：涂绿会被读成「很小」。
 */
export const sizeToColor = (
  bytes: number | null | undefined,
  scale: SizeScale,
  isDark = false,
): string | null => {
  if (bytes === null || bytes === undefined) {
    return null;
  }
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }
  const hue = 100 * (1 - sizeToRatio(bytes, scale));
  const lightness = isDark ? 55 : 45;
  return `hsl(${hue.toFixed(1)}, 65%, ${lightness}%)`;
};
