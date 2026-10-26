import { css } from '@emotion/core';
import classNames from 'classnames';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Icon, Tooltip } from '@/components';
import { FC } from '@/interfaces';
import { AppState } from '@/store';
import style from '@/style';
import { formatBytes, SIZE_SCALE, SizeScaleName, sizeToColor } from '@/utils/size';

interface SizeBadgeProps {
  /** 字节数。缺省或 0 显示灰色描边，不是绿色 —— 绿色会被读成「很小」。 */
  bytes?: number | null;
  /** 用哪套阈值：文件级 100 KB–20 MB，项目级 20 MB–400 MB。 */
  scale?: SizeScaleName;
  /** tooltip 口径：项目占用 / 单文件大小。 */
  scope?: 'project' | 'file';
  className?: string;
}

/**
 * 进度条左端的容量徽标：一颗小磁盘，底色按体积渐变。
 *
 * 组件自己不做数据获取，也不知道自己是项目还是文件 —— 由调用方给字节数与
 * 阈值名。这样它既能挂在项目卡片上，也能挂在图片卡片上。
 */
export const SizeBadge: FC<SizeBadgeProps> = ({
  bytes,
  scale = 'project',
  scope = 'project',
  className,
}) => {
  const { formatMessage } = useIntl();
  const isDark = useSelector(
    (state: AppState) => state.site.themeMode === 'dark',
  );
  const color = sizeToColor(bytes, SIZE_SCALE[scale], isDark);
  const text = formatBytes(bytes);

  const overlay =
    text === null
      ? formatMessage({ id: 'storageUsage.unknown' })
      : formatMessage(
          {
            id:
              scope === 'project'
                ? 'storageUsage.project'
                : 'storageUsage.file',
          },
          // file_size 是 KB 取整的结果，恒定带 ≈ 表示「近似值」。
          { size: `≈ ${text}` },
        );

  return (
    <Tooltip overlay={overlay}>
      <span
        className={classNames('SizeBadge', className)}
        css={css`
          display: inline-flex;
          flex: none;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 10px;
          /* 18×10 的小块用全局 8px 圆角会变成药丸，失去「切出一格」的辨识度 */
          border-radius: 3px;
          background: ${color || 'transparent'};
          border: ${color ? 'none' : `1px solid ${style.borderColorBase}`};
          color: ${color ? '#fff' : style.textColorLighter};
          font-size: 7px;
          line-height: 1;
          cursor: default;
          @media (max-width: 768px) {
            width: 14px;
          }
        `}
      >
        <Icon icon="hdd" />
      </span>
    </Tooltip>
  );
};
