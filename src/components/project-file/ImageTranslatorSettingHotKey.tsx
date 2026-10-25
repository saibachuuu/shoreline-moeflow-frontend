import { css } from '@emotion/core';
import classNames from 'classnames';
import { Input } from 'antd';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { FC } from '@/interfaces';
import { AppState } from '@/store';
import style from '@/style';
import { HotKeyState, setHotKey } from '@/store/hotKey/slice';
import { setTipTriggerCharacter } from '@/store/imageTranslator/slice';
import {
  isValidTipTriggerCharacter,
  saveTipTriggerCharacter,
} from '@/components/project-file/markers/proofread/tipTriggerCharacter';
import { saveHotKey } from '@/utils/storage';
import { HotKeyRecorder } from '@/components/HotKey';
import {
  ARROW_KEY_EVENT_CODES,
  MAIN_KEY_EVENT_CODES,
  SPACE_KEY_EVENT_CODES,
} from '@/components/HotKey/constants';
import { HotKeyEvent } from '@/components/HotKey/interfaces';

/** 快捷键设置的属性接口 */
interface ImageTranslatorSettingHotKeyProps {
  className?: string;
}
/**
 * 快捷键设置
 */
export const ImageTranslatorSettingHotKey: FC<
  ImageTranslatorSettingHotKeyProps
> = ({ className }) => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const focusNextSourceHotKeyOptions = useSelector(
    (state: AppState) => state.hotKey.focusNextSource,
  );
  const focusPrevSourceHotKeyOptions = useSelector(
    (state: AppState) => state.hotKey.focusPrevSource,
  );
  const goPrevPageHotKeyOptions = useSelector(
    (state: AppState) => state.hotKey.goPrevPage,
  );
  const goNextPageHotKeyOptions = useSelector(
    (state: AppState) => state.hotKey.goNextPage,
  );
  const sendProofreadDraftHotKeyOptions = useSelector(
    (state: AppState) => state.hotKey.sendProofreadDraft,
  );
  const tipTriggerCharacter = useSelector(
    (state: AppState) => state.imageTranslator.tipTriggerCharacter,
  );
  /** 触发字符输入框的暂存值，null 表示显示当前生效值 */
  const [tipTriggerDraft, setTipTriggerDraft] = useState<string | null>(null);

  const handleTipTriggerChange = (value: string) => {
    // 取末位字符：键入新字符（框内已有值时被追加在末尾）或一次粘贴多字符都只取最后一个
    const lastChar = value.slice(-1);
    if (isValidTipTriggerCharacter(lastChar)) {
      setTipTriggerDraft(null);
      dispatch(setTipTriggerCharacter(lastChar));
      saveTipTriggerCharacter(lastChar);
    } else {
      // 空串或空白：仅暂存显示，不生效，失焦时回退当前生效值
      setTipTriggerDraft(value);
    }
  };

  const handleHotKeyChange = ({
    name,
    index,
    hotKey,
  }: {
    name: keyof HotKeyState;
    index: number;
    hotKey?: HotKeyEvent;
  }) => {
    if (hotKey) {
      if (
        MAIN_KEY_EVENT_CODES.includes(hotKey.key) &&
        hotKey.shift === true &&
        hotKey.ctrl === false &&
        hotKey.alt === false &&
        hotKey.meta === false
      ) {
        alert(
          '请勿设置 Shift + 字母/数字/符号 的快捷键，这样会导致输入框中无法输入此大写字母/符号。',
        );
        return;
      }
      if (
        [
          ...MAIN_KEY_EVENT_CODES,
          ...ARROW_KEY_EVENT_CODES,
          ...SPACE_KEY_EVENT_CODES,
        ].includes(hotKey.key) &&
        hotKey.shift === false &&
        hotKey.ctrl === false &&
        hotKey.alt === false &&
        hotKey.meta === false
      ) {
        alert(
          '请勿设置 只含有字母/数字/符号/箭头/空格 等快捷键，这样会导致输入框中无法使用此按键。',
        );
        return;
      }
    }
    const option = hotKey
      ? {
          key: hotKey.key,
          shift: hotKey.shift,
          ctrl: hotKey.ctrl,
          alt: hotKey.alt,
          meta: hotKey.meta,
          ignoreKeyboardElement: false,
        }
      : undefined;
    dispatch(setHotKey({ name, index, option }));
    saveHotKey({ name, index, option });
  };

  return (
    <div
      className={classNames(['ImageTranslatorSettingHotKey', className])}
      css={css`
        display: grid;
        grid-template-columns: 100px 1fr 1fr;
        grid-row-gap: 10px;
        grid-column-gap: 10px;
        align-items: center;
        .ImageTranslatorSettingHotKey__HeaderLabel {
          font-weight: bold;
          line-height: 32px;
        }
      `}
    >
      <div className="ImageTranslatorSettingHotKey__HeaderLabel">
        {formatMessage({ id: 'hotKey.function' })}
      </div>
      <div className="ImageTranslatorSettingHotKey__HeaderLabel">
        {formatMessage({ id: 'hotKey.mainHotKey' })}
      </div>
      <div className="ImageTranslatorSettingHotKey__HeaderLabel">
        {formatMessage({ id: 'hotKey.subHotKey' })}
      </div>
      <div className="ImageTranslatorSettingHotKey__Label">
        {formatMessage({ id: 'hotKey.focusPrevSource' })}
      </div>
      <HotKeyRecorder
        hotKey={focusPrevSourceHotKeyOptions[0]}
        onHotKeyChange={(hotKey) => {
          handleHotKeyChange({ name: 'focusPrevSource', index: 0, hotKey });
        }}
      />
      <HotKeyRecorder
        hotKey={focusPrevSourceHotKeyOptions[1]}
        onHotKeyChange={(hotKey) => {
          handleHotKeyChange({ name: 'focusPrevSource', index: 1, hotKey });
        }}
      />
      <div className="ImageTranslatorSettingHotKey__Label">
        {formatMessage({ id: 'hotKey.focusNextSource' })}
      </div>
      <HotKeyRecorder
        hotKey={focusNextSourceHotKeyOptions[0]}
        onHotKeyChange={(hotKey) => {
          handleHotKeyChange({ name: 'focusNextSource', index: 0, hotKey });
        }}
      />
      <HotKeyRecorder
        hotKey={focusNextSourceHotKeyOptions[1]}
        onHotKeyChange={(hotKey) => {
          handleHotKeyChange({ name: 'focusNextSource', index: 1, hotKey });
        }}
      />
      <div className="ImageTranslatorSettingHotKey__Label">
        {formatMessage({ id: 'hotKey.goPrevPage' })}
      </div>
      <HotKeyRecorder
        hotKey={goPrevPageHotKeyOptions[0]}
        onHotKeyChange={(hotKey) => {
          handleHotKeyChange({ name: 'goPrevPage', index: 0, hotKey });
        }}
      />
      <HotKeyRecorder
        hotKey={goPrevPageHotKeyOptions[1]}
        onHotKeyChange={(hotKey) => {
          handleHotKeyChange({ name: 'goPrevPage', index: 1, hotKey });
        }}
      />
      <div className="ImageTranslatorSettingHotKey__Label">
        {formatMessage({ id: 'hotKey.goNextPage' })}
      </div>
      <HotKeyRecorder
        hotKey={goNextPageHotKeyOptions[0]}
        onHotKeyChange={(hotKey) => {
          handleHotKeyChange({ name: 'goNextPage', index: 0, hotKey });
        }}
      />
      <HotKeyRecorder
        hotKey={goNextPageHotKeyOptions[1]}
        onHotKeyChange={(hotKey) => {
          handleHotKeyChange({ name: 'goNextPage', index: 1, hotKey });
        }}
      />
      <div className="ImageTranslatorSettingHotKey__Label">
        {formatMessage({ id: 'hotKey.sendProofreadDraft' })}
      </div>
      <HotKeyRecorder
        hotKey={sendProofreadDraftHotKeyOptions[0]}
        onHotKeyChange={(hotKey) => {
          handleHotKeyChange({ name: 'sendProofreadDraft', index: 0, hotKey });
        }}
      />
      <HotKeyRecorder
        hotKey={sendProofreadDraftHotKeyOptions[1]}
        onHotKeyChange={(hotKey) => {
          handleHotKeyChange({ name: 'sendProofreadDraft', index: 1, hotKey });
        }}
      />
      <div className="ImageTranslatorSettingHotKey__Label">
        {formatMessage({ id: 'hotKey.tipTriggerCharacter' })}
      </div>
      <Input
        className="ImageTranslatorSettingHotKey__TipTriggerInput"
        css={css`
          width: 80px;
        `}
        value={tipTriggerDraft ?? tipTriggerCharacter}
        onChange={(e) => handleTipTriggerChange(e.target.value)}
        onBlur={() => setTipTriggerDraft(null)}
      />
      <div
        className="ImageTranslatorSettingHotKey__TipTriggerDesc"
        css={css`
          grid-column: 1 / -1;
          font-size: 12px;
          color: ${style.textColorSecondary};
          line-height: 1.5;
        `}
      >
        {formatMessage({ id: 'hotKey.tipTriggerCharacterDesc' })}
      </div>
    </div>
  );
};
