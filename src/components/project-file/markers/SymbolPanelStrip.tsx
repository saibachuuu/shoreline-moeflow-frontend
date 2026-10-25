import { css } from '@emotion/core';
import classNames from 'classnames';
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import store from 'store';
import { FC } from '@/interfaces';
import style from '@/style';
import { SymbolPanel } from './SymbolPanel';

/** 符号面板收展条的属性接口 */
interface SymbolPanelStripProps {
  /** 是否展开 */
  visible: boolean;
  disabled?: boolean;
  onInsert: (character: string) => void;
  /**
   * 展开时会被挤矮的滚动列表：列表原本贴底浏览时，同步下移滚动位置，
   * 让列表底部内容（如“确认以上翻译”按钮）留在可视区
   */
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

/**
 * 符号面板收展条（校对/翻译/原文模式共用）。
 *
 * 放在列表与底部面板之间的文档流元素：展开时高度从 0 长到面板实测高度，
 * 把上方列表整体挤上去；收起时高度归零，不会覆盖列表里的任何内容。
 * 面板本体随窗口从底部面板后方升起（justify-content: flex-end 锚定底边）。
 */
export const SymbolPanelStrip: FC<SymbolPanelStripProps> = ({
  visible,
  disabled = false,
  onInsert,
  scrollContainerRef,
}) => {
  /** 面板本体高度：收展窗口展开到这个高度 */
  const [panelHeight, setPanelHeight] = useState(0);
  const panelDomRef = useRef<HTMLDivElement>(null);

  // 量符号面板本体高度，供收展窗口使用
  useLayoutEffect(() => {
    const panel = panelDomRef.current;
    if (!panel) return undefined;
    const measure = () => {
      const next = panel.offsetHeight;
      setPanelHeight((previous) => (previous === next ? previous : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  // 展开会把列表视口挤矮：列表原本贴底浏览时，把滚动位置同步下移；
  // 离底部较远时不打扰阅读位置
  useEffect(() => {
    if (!visible || panelHeight === 0) {
      return undefined;
    }
    const list = scrollContainerRef?.current;
    if (!list) {
      return undefined;
    }
    const distanceToBottom =
      list.scrollHeight - list.scrollTop - list.clientHeight;
    if (distanceToBottom > panelHeight + 1) {
      return undefined;
    }
    const pin = () => {
      list.scrollTop = list.scrollHeight;
    };
    const raf = requestAnimationFrame(pin);
    // 高度过渡 0.18s 结束后再校一次，此时列表视口才是最终高度
    const timer = window.setTimeout(pin, 220);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [visible, panelHeight, scrollContainerRef]);

  return (
    <div
      className={classNames('SymbolPanelStrip', {
        'SymbolPanelStrip--visible': visible,
      })}
      css={css`
        /* 文档流收展条：高度 0 ↔ 面板实测高度，呼出时把上方列表整体挤上去 */
        flex: none;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        overflow: hidden;
        height: 0;
        visibility: hidden;
        transition:
          height 0.18s ease-out,
          visibility 0s 0.18s;
        &.SymbolPanelStrip--visible {
          height: ${panelHeight}px;
          visibility: visible;
          transition:
            height 0.18s ease-out,
            visibility 0s;
        }
      `}
    >
      <div
        ref={panelDomRef}
        className="SymbolPanelStrip__Panel"
        css={css`
          flex: none;
          max-height: 96px;
          overflow-y: auto;
          border-top: 1px solid ${style.borderColorBase};
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
          /* 已在文档流中让位，不再需要半透明 */
          background-color: ${style.backgroundColorLight};
        `}
      >
        <SymbolPanel disabled={disabled} onInsert={onInsert} />
      </div>
    </div>
  );
};

const SYMBOL_PANEL_VISIBLE_STORAGE_KEY = 'symbolInputterVisible';

/**
 * 符号面板开合状态，localStorage 持久化（沿用原“显示符号工具”的 key，
 * 三个模式共用一份偏好）。
 */
export function useSymbolPanelVisible(): [
  boolean,
  Dispatch<SetStateAction<boolean>>,
] {
  const [visible, setVisible] = useState(() =>
    store.get(SYMBOL_PANEL_VISIBLE_STORAGE_KEY, false),
  );
  useEffect(() => {
    store.set(SYMBOL_PANEL_VISIBLE_STORAGE_KEY, visible);
  }, [visible]);
  return [visible, setVisible];
}
