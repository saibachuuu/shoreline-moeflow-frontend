import { css } from '@emotion/core';
import { FC } from '@/interfaces';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { AppState } from '@/store';
import { Icon } from '@/components';
import { useZitengCheck } from './state';
import { isZitengClear } from './logic';

interface ZitengClearBannerProps {
  projectID: string;
}

/**
 * 撞车判定为"未撞车"时在搜索框下方常态化显示的细行。
 *
 * 交互规范：
 * - 桌面端：初次看到此项目时常态化展开（细行）；鼠标滑过离开后向上收回，
 *   但露出一条更细的绿线（3px）。鼠标悬停在绿线上时重新展开。
 * - 移动端：永不自动收回，锁定在卡片区域最上方，随页面滚动而移出视野。
 * - 浮于图片卡片上层展示，不挤占卡片高度流，且不阻碍用户点击卡片。
 */
export const ZitengClearBanner: FC<ZitengClearBannerProps> = ({
  projectID,
}) => {
  const { formatMessage } = useIntl();
  const platform = useSelector((state: AppState) => state.site.platform);
  const isMobile = platform === 'mobile';

  const { check } = useZitengCheck(projectID);

  const storageKey = `ziteng_clear_banner_seen_${projectID}`;
  const [retracted, setRetracted] = useState<boolean>(() => {
    try {
      return Boolean(window.localStorage?.getItem(storageKey));
    } catch {
      return false;
    }
  });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    try {
      setRetracted(Boolean(window.localStorage?.getItem(storageKey)));
    } catch {
      setRetracted(false);
    }
    setHovered(false);
  }, [storageKey]);

  // 仅在明确判定为未撞车时展示
  if (!isZitengClear(check)) {
    return null;
  }

  // 移动端永不自动收回；桌面端首次进入展开，划过离开后仅悬停展开
  const isExpanded = isMobile || !retracted || hovered;

  const handleMouseEnter = () => {
    if (!isMobile) {
      setHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setHovered(false);
      if (!retracted) {
        setRetracted(true);
        try {
          window.localStorage?.setItem(storageKey, '1');
        } catch {
          // ignore localStorage restrictions
        }
      }
    }
  };

  const handleClick = () => {
    if (!isMobile && !retracted) {
      setRetracted(true);
      try {
        window.localStorage?.setItem(storageKey, '1');
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      className="ZitengClearBanner"
      css={css`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        z-index: 10;
        pointer-events: ${isMobile ? 'none' : 'auto'};
        user-select: none;
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div
        className="ZitengClearBanner__Bar"
        css={css`
          position: relative;
          width: 100%;
          height: ${isExpanded ? '24px' : '3px'};
          line-height: 24px;
          overflow: hidden;
          transition:
            height 0.24s cubic-bezier(0.2, 0, 0, 1),
            background-color 0.2s ease,
            border-color 0.2s ease;
          background-color: ${isExpanded
            ? 'rgba(82, 196, 26, 0.08)'
            : 'rgba(82, 196, 26, 0.55)'};
          border-bottom: ${isExpanded
            ? '1px solid rgba(82, 196, 26, 0.25)'
            : 'none'};
          color: #2b7808;

          [data-theme='dark'] & {
            background-color: ${isExpanded
              ? 'rgba(73, 170, 25, 0.10)'
              : 'rgba(73, 170, 25, 0.55)'};
            border-bottom: ${isExpanded
              ? '1px solid rgba(73, 170, 25, 0.28)'
              : 'none'};
            color: #73d13d;
          }

          /* 桌面收起时留出易触发 hover 的不可见热区 */
          ${!isMobile &&
          !isExpanded &&
          css`
            cursor: pointer;
            &::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 10px;
            }
          `}
        `}
      >
        <div
          className="ZitengClearBanner__Content"
          css={css`
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 16px;
            font-size: 11px;
            white-space: nowrap;
            opacity: ${isExpanded ? 1 : 0};
            transition: opacity 0.18s ease;
            pointer-events: none;
          `}
        >
          <Icon
            icon="check"
            css={css`
              margin-right: 6px;
              font-size: 10px;
            `}
          />
          <span>{formatMessage({ id: 'project.zitengClear' })}</span>
        </div>
      </div>
    </div>
  );
};
