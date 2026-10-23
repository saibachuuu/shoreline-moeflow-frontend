import { css } from '@emotion/core';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import store from 'store';
import { FC } from '@/interfaces';
import style from '@/style';
import { getHotKeyDisplayName } from '@/components/HotKey/utils';
import { useQuickCharacterHotKey } from './useQuickCharacterHotKey';
const STORAGE_KEY = 'symbolInputterVisible';

interface QuickCharacterButtonsProps {
  disabled?: boolean;
  onInsert: (character: string) => void;
}

export const QuickCharacterButtons: FC<QuickCharacterButtonsProps> = ({
  disabled = false,
  onInsert,
}) => {
  const { formatMessage } = useIntl();
  const [visible, setVisible] = useState(() =>
    store.get(STORAGE_KEY, false),
  );
  const quickCharacters = useQuickCharacterHotKey(disabled, onInsert);

  useEffect(() => {
    store.set(STORAGE_KEY, visible);
  }, [visible]);

  if (!visible) {
    return (
      <div
        className="QuickCharacters"
        css={css`
          display: flex;
          justify-content: flex-end;
          padding: 4px 8px;
          border-top: 1px solid ${style.borderColorBase};
          background-color: ${style.backgroundColorLight};
          button {
            height: 24px;
            padding: 0 5px;
            border: 1px solid ${style.borderColorBase};
            border-radius: ${style.borderRadiusSm};
            background: ${style.backgroundColorLight};
            color: ${style.textColor};
            cursor: pointer;
          }
          button:hover {
            border-color: ${style.primaryColor};
            color: ${style.primaryColor};
          }
        `}
      >
        <button type="button" onClick={() => setVisible(true)}>
          {formatMessage({ id: 'quickChar.showSymbolTools' })}
        </button>
      </div>
    );
  }

  return (
    <div
      className="QuickCharacters"
      css={css`
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 4px 8px;
        border-top: 1px solid ${style.borderColorBase};
        background-color: ${style.backgroundColorLight};

        button {
          min-width: 26px;
          height: 24px;
          padding: 0 5px;
           border: 1px solid ${style.borderColorBase};
           border-radius: ${style.borderRadiusSm};
           background: ${style.backgroundColorLight};
           color: ${style.textColor};
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
      <button
        type="button"
        onClick={() => setVisible(false)}
        css={css`
          margin-left: auto;
        `}
      >
        {formatMessage({ id: 'quickChar.hideSymbolTools' })}
      </button>
    </div>
  );
};