import { css } from '@emotion/core';
import classNames from 'classnames';
import React from 'react';
import { FC } from '@/interfaces';
import style from '@/style';
import { hover } from '@/utils/style';

interface FunctionBarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 高亮态：切换类工具按钮的开启状态（如符号面板开关） */
  active?: boolean;
}

/**
 * 图片翻译工具按钮：校对模式按钮行、翻译/原文模式的符号工具条共用。
 * 展示为浅色小按钮，active 时使用主题色描边。
 */
export const FunctionBarButton: FC<FunctionBarButtonProps> = ({
  active = false,
  className,
  ...props
}) => (
  <button
    type="button"
    className={classNames(className, {
      'FunctionBarButton--active': active,
    })}
    css={css`
      margin-right: 6px;
      background-color: ${style.backgroundColorLight};
      color: ${style.textColorSecondary};
      border: 1px solid ${style.borderColorBase};
      border-radius: ${style.borderRadiusSm};
      cursor: pointer;
      ${hover(css`
        background-color: ${style.hoverColor};
      `)};
      &.FunctionBarButton--active {
        border-color: ${style.primaryColor};
        color: ${style.primaryColor};
      }
      /* Popconfirm 会把禁用的原生按钮克隆成带此类的元素，去掉边框 */
      &.ant-popover-disabled-compatible-wrapper {
        border: none;
      }
    `}
    {...props}
  />
);
