import { css } from '@emotion/core';
import React, { useEffect, useState } from 'react';
import store from 'store';
import { FC } from '@/interfaces';
import style from '@/style';
import { QUICK_CHARACTERS } from './quickCharacters';

const STORAGE_KEY = 'symbolInputterVisible';

interface QuickCharacterButtonsProps {
  disabled?: boolean;
  onInsert: (character: string) => void;
}

export const QuickCharacterButtons: FC<QuickCharacterButtonsProps> = ({
  disabled = false,
  onInsert,
}) => {
  const [visible, setVisible] = useState(() =>
    store.get(STORAGE_KEY, false),
  );

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
           显示符号工具
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
      {QUICK_CHARACTERS.map((character) => (
        <button
          type="button"
          key={character}
          title={`插入 ${character}`}
          aria-label={`插入 ${character}`}
          disabled={disabled}
          onClick={() => onInsert(character)}
        >
          {character}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setVisible(false)}
        css={css`
          margin-left: auto;
        `}
      >
         隐藏符号工具
      </button>
    </div>
  );
};