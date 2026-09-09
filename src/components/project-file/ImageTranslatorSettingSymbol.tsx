import { css } from '@emotion/core';
import { Button, Input, Popconfirm } from 'antd';
import classNames from 'classnames';
import React from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { HotKeyRecorder } from '@/components/HotKey';
import { HotKeyEvent, HotKeyOption } from '@/components/HotKey/interfaces';
import {
  resetQuickCharacterItems,
  saveQuickCharacterItems,
} from '@/components/project-file/markers/quickCharacters';
import { FC } from '@/interfaces';
import { AppState } from '@/store';
import {
  resetQuickCharacters,
  setQuickCharacterItems,
} from '@/store/imageTranslator/slice';
import style from '@/style';

interface ImageTranslatorSettingSymbolProps {
  className?: string;
}

export const ImageTranslatorSettingSymbol: FC<
  ImageTranslatorSettingSymbolProps
> = ({ className }) => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const quickCharacters = useSelector(
    (state: AppState) => state.imageTranslator.quickCharacters,
  );

  const handleCharacterChange = (index: number, character: string) => {
    const newItems = quickCharacters.map((item, i) =>
      i === index ? { ...item, character } : item,
    );
    dispatch(setQuickCharacterItems(newItems));
    saveQuickCharacterItems(newItems);
  };

  const handleHotKeyChange = (index: number, hotKey?: HotKeyEvent) => {
    const option: HotKeyOption | undefined = hotKey
      ? {
          key: hotKey.key,
          shift: hotKey.shift,
          ctrl: hotKey.ctrl,
          alt: hotKey.alt,
          meta: hotKey.meta,
          ignoreKeyboardElement: false,
        }
      : undefined;
    const newItems = quickCharacters.map((item, i) =>
      i === index ? { ...item, hotKey: option } : item,
    );
    dispatch(setQuickCharacterItems(newItems));
    saveQuickCharacterItems(newItems);
  };

  const handleRestoreDefault = () => {
    resetQuickCharacterItems();
    dispatch(resetQuickCharacters());
  };

  return (
    <div
      className={classNames(['ImageTranslatorSettingSymbol', className])}
      css={css`
        margin-top: 20px;
        margin-bottom: 10px;

        .ImageTranslatorSettingSymbol__Header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .ImageTranslatorSettingSymbol__Title {
          font-weight: bold;
          font-size: 14px;
          color: ${style.textColor};
        }

        .ImageTranslatorSettingSymbol__Desc {
          font-size: 12px;
          color: ${style.textColorSecondary};
          margin-bottom: 12px;
        }

        .ImageTranslatorSettingSymbol__Grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-gap: 8px 16px;
          max-height: 380px;
          overflow-y: auto;
          padding-right: 4px;

          @media (max-width: 600px) {
            grid-template-columns: 1fr;
          }
        }

        .ImageTranslatorSettingSymbol__Row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ImageTranslatorSettingSymbol__Index {
          width: 24px;
          text-align: right;
          color: ${style.textColorSecondary};
          font-size: 12px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .ImageTranslatorSettingSymbol__CharInput {
          width: 56px;
          text-align: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .ImageTranslatorSettingSymbol__HotKeyRecorder {
          flex: 1;
          min-width: 0;
        }
      `}
    >
      <div className="ImageTranslatorSettingSymbol__Header">
        <div className="ImageTranslatorSettingSymbol__Title">
          {formatMessage({ id: 'quickChar.symbolSettingTitle' })}
        </div>
        <Popconfirm
          title={formatMessage({ id: 'quickChar.confirmRestore' })}
          onConfirm={handleRestoreDefault}
          okText={formatMessage({ id: 'site.confirm' })}
          cancelText={formatMessage({ id: 'site.cancel' })}
        >
          <Button size="small" type="default">
            {formatMessage({ id: 'quickChar.restoreDefault' })}
          </Button>
        </Popconfirm>
      </div>
      <div className="ImageTranslatorSettingSymbol__Desc">
        {formatMessage({ id: 'quickChar.symbolSettingDesc' })}
      </div>
      <div className="ImageTranslatorSettingSymbol__Grid">
        {quickCharacters.map((item, index) => (
          <div key={index} className="ImageTranslatorSettingSymbol__Row">
            <div className="ImageTranslatorSettingSymbol__Index">
              #{index + 1}
            </div>
            <Input
              className="ImageTranslatorSettingSymbol__CharInput"
              value={item.character}
              onChange={(e) => handleCharacterChange(index, e.target.value)}
              placeholder={formatMessage({ id: 'quickChar.symbolPlaceholder' })}
              maxLength={10}
            />
            <HotKeyRecorder
              className="ImageTranslatorSettingSymbol__HotKeyRecorder"
              hotKey={item.hotKey}
              onHotKeyChange={(hotKey) => handleHotKeyChange(index, hotKey)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
