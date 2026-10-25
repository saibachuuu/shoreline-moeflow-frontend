import { css } from '@emotion/core';
import React from 'react';
import { useIntl } from 'react-intl';
import { FC } from '@/interfaces';
import style from '@/style';
import { getHotKeyDisplayName } from '@/components/HotKey/utils';
import { useQuickCharacterHotKey } from './useQuickCharacterHotKey';

/** 符号面板的属性接口 */
interface SymbolPanelProps {
  disabled?: boolean;
  onInsert: (character: string) => void;
}
/**
 * 符号面板（校对/翻译/原文模式共用）
 *
 * 只渲染符号按钮本身，展开与收起的动画由外层的收展条（SymbolPanelStrip）负责。
 */
export const SymbolPanel: FC<SymbolPanelProps> = ({
  disabled = false,
  onInsert,
}) => {
  const { formatMessage } = useIntl();
  const quickCharacters = useQuickCharacterHotKey(disabled, onInsert);

  return (
    <div
      className="SymbolPanel"
      css={css`
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 6px 11px 8px;

        button {
          min-width: 26px;
          height: 24px;
          padding: 0 5px;
          border: 1px solid ${style.borderColorBase};
          border-radius: ${style.borderRadiusSm};
          background: ${style.backgroundColorLight};
          color: ${style.textColor};
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
        }

        button:hover:not(:disabled) {
          border-color: ${style.primaryColor};
          color: ${style.primaryColor};
        }

        button:disabled {
          cursor: not-allowed;
          color: ${style.textColorSecondaryLighter};
        }
      `}
    >
      {quickCharacters.map((item, index) => {
        const hotKeyDisplay = item.hotKey
          ? getHotKeyDisplayName(item.hotKey)
          : '';
        const title = hotKeyDisplay
          ? formatMessage(
              { id: 'quickChar.insertWithHotkey' },
              { character: item.character, hotKey: hotKeyDisplay },
            )
          : formatMessage(
              { id: 'quickChar.insert' },
              { character: item.character },
            );
        return (
          <button
            type="button"
            key={index}
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={() => onInsert(item.character)}
          >
            {item.character}
          </button>
        );
      })}
    </div>
  );
};
