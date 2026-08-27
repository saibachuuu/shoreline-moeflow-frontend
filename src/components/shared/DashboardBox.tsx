import { css } from '@emotion/core';
import React from 'react';
import { FC } from '@/interfaces';
import style from '../../style';

/** 带有导航栏的布局的属性接口 */
interface DashboardBoxProps {
  /* 导航，横着在顶部（一般用于 PC 版，手机版自行处理成单独的页面） */
  nav?: React.ReactNode | React.ReactNode[];
  content: React.ReactNode | React.ReactNode[];
  className?: string;
}
/**
 * 带有导航栏的布局
 */
export const DashboardBox: FC<DashboardBoxProps> = ({
  nav,
  content,
  className,
}) => {
  return (
    <div
      className={className}
      css={css`
        flex: auto;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: stretch;
        height: 100%;
        width: 100%;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        .DashboardBox__Nav {
          flex: none;
          height: ${style.navHeight}px;
        }
        .DashboardBox__Content {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          width: 100%;
          height: auto;
          min-width: 0;
          min-height: 0;
          overflow: auto;
        }
        ${nav &&
        css`
          .DashboardBox__Content {
            height: auto;
          }
        `}
      `}
    >
      {nav && <div className="DashboardBox__Nav">{nav}</div>}
      <div className="DashboardBox__Content">{content}</div>
    </div>
  );
};
