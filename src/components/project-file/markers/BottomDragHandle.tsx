import { css } from '@emotion/core';
import React, { useCallback, useRef, useState } from 'react';
import { FC } from '@/interfaces';
import style from '@/style';

interface BottomHeightResizeOptions {
  /** 默认面板高度 */
  baseHeight: number;
  /** 拖拽下限 */
  min?: number;
  /** 拖拽上限 */
  max?: number;
}

/**
 * 底部面板高度拖拽调整（非持久化：切模式/刷新回到默认高度）。
 * 返回当前高度与可直接展开到拖拽条上的 pointer handlers。
 */
export function useBottomHeightResize({
  baseHeight,
  min = 80,
  max = 500,
}: BottomHeightResizeOptions) {
  const [adjustedHeight, setAdjustedHeight] = useState<number | null>(null);
  const bottomHeight = adjustedHeight ?? baseHeight;
  const bottomHeightRef = useRef(bottomHeight);
  bottomHeightRef.current = bottomHeight;
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      isDragging.current = true;
      dragStartY.current = e.clientY;
      dragStartHeight.current = bottomHeightRef.current;
    },
    [],
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      const deltaY = dragStartY.current - e.clientY;
      const newHeight = Math.min(
        Math.max(dragStartHeight.current + deltaY, min),
        max,
      );
      setAdjustedHeight(newHeight);
    },
    [min, max],
  );

  const handleDragEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
    },
    [],
  );

  return {
    bottomHeight,
    dragHandlers: {
      onPointerDown: handleDragStart,
      onPointerMove: handleDragMove,
      onPointerUp: handleDragEnd,
      onPointerCancel: handleDragEnd,
    },
  };
}

/** 底部面板拖拽条的属性接口 */
interface BottomDragHandleProps {
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onPointerMove: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp: React.PointerEventHandler<HTMLDivElement>;
  onPointerCancel: React.PointerEventHandler<HTMLDivElement>;
}

/**
 * 底部面板拖拽调高条：放在面板顶部，面板自身的顶边框由它承载。
 */
export const BottomDragHandle: FC<BottomDragHandleProps> = (props) => (
  <div
    className="BottomDragHandle"
    css={css`
      flex: none;
      height: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: ns-resize;
      touch-action: none;
      user-select: none;
      background-color: ${style.backgroundColorLight};
      border-top: 3px solid ${style.borderColorBase};
      border-bottom: 1px solid ${style.borderColorBase};
    `}
    {...props}
  >
    <div
      className="BottomDragHandle__Bar"
      css={css`
        width: 30px;
        height: 4px;
        border-radius: 2px;
        background-color: ${style.borderColorBase};
      `}
    />
  </div>
);
