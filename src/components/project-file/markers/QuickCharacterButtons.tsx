import { css } from '@emotion/core';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import store from 'store';
import { FC } from '@/interfaces';
import { AppState } from '@/store';
import style from '@/style';
import { MODIFIER_KEY_EVENT_KEYS } from '@/components/HotKey/constants';
import {
  getHotKeyDisplayName,
  getHotKeyEvent,
  isKeyboardElement,
} from '@/components/HotKey/utils';
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
  const quickCharacters = useSelector(
    (state: AppState) => state.imageTranslator.quickCharacters,
  );
  const [visible, setVisible] = useState(() =>
    store.get(STORAGE_KEY, false),
  );

  useEffect(() => {
    store.set(STORAGE_KEY, visible);
  }, [visible]);

  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (nativeEvent: KeyboardEvent) => {
      if (MODIFIER_KEY_EVENT_KEYS.includes(nativeEvent.key)) return;

      const target = nativeEvent.target as HTMLElement | null;
      if (!target) return;

      // Don't trigger if user is interacting with a modal
      if (target.closest?.('.ant-modal, .ant-modal-mask')) return;

      // Don't trigger if user is typing into any <input>
      if (target.tagName === 'INPUT') return;

      // If it is another keyboard element but not a textarea, don't trigger
      if (isKeyboardElement(target) && target.tagName !== 'TEXTAREA') return;

      const event = getHotKeyEvent(nativeEvent);

      const matchedItem = quickCharacters.find((item) => {
        const hotKey = item.hotKey;
        if (!hotKey || !hotKey.key) return false;
        if (event.key !== hotKey.key) return false;
        if (Boolean(event.ctrl) !== Boolean(hotKey.ctrl)) return false;
        if (Boolean(event.alt) !== Boolean(hotKey.alt)) return false;
        if (Boolean(event.shift) !== Boolean(hotKey.shift)) return false;
        if (Boolean(event.meta) !== Boolean(hotKey.meta)) return false;
        return true;
      });

      if (matchedItem && matchedItem.character) {
        nativeEvent.preventDefault();
        nativeEvent.stopPropagation();
        onInsert(matchedItem.character);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled, quickCharacters, onInsert]);

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