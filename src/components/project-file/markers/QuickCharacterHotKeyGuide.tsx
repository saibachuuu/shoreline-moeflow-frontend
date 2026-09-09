import { css } from '@emotion/core';
import classNames from 'classnames';
import React from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { HotKeyOption } from '@/components/HotKey/interfaces';
import { getHotKeyDisplayName } from '@/components/HotKey/utils';
import { FC } from '@/interfaces';
import { AppState } from '@/store';
import style from '@/style';

interface QuickCharacterHotKeyGuideProps {
  className?: string;
}

export const QuickCharacterHotKeyGuide: FC<QuickCharacterHotKeyGuideProps> = ({
  className,
}) => {
  const { formatMessage } = useIntl();

  const quickCharacters = useSelector(
    (state: AppState) => state.imageTranslator.quickCharacters,
  );
  const focusPrevSourceOptions = useSelector(
    (state: AppState) => state.hotKey.focusPrevSource,
  );
  const focusNextSourceOptions = useSelector(
    (state: AppState) => state.hotKey.focusNextSource,
  );
  const goPrevPageOptions = useSelector(
    (state: AppState) => state.hotKey.goPrevPage,
  );
  const goNextPageOptions = useSelector(
    (state: AppState) => state.hotKey.goNextPage,
  );

  const mappedSymbols = quickCharacters.filter(
    (item) => item.hotKey && item.hotKey.key,
  );

  const formatOptions = (options: (HotKeyOption | undefined)[]) => {
    return (options || [])
      .filter((opt): opt is HotKeyOption => Boolean(opt && opt.key))
      .map((opt) => getHotKeyDisplayName(opt));
  };

  const navHotKeys = [
    {
      id: 'focusPrevSource',
      label: formatMessage({ id: 'hotKey.focusPrevSource' }),
      keys: formatOptions(focusPrevSourceOptions),
    },
    {
      id: 'focusNextSource',
      label: formatMessage({ id: 'hotKey.focusNextSource' }),
      keys: formatOptions(focusNextSourceOptions),
    },
    {
      id: 'goPrevPage',
      label: formatMessage({ id: 'hotKey.goPrevPage' }),
      keys: formatOptions(goPrevPageOptions),
    },
    {
      id: 'goNextPage',
      label: formatMessage({ id: 'hotKey.goNextPage' }),
      keys: formatOptions(goNextPageOptions),
    },
  ];

  const mouseActions = [
    {
      label: formatMessage({ id: 'mouse.addInLabel' }),
      key: formatMessage({ id: 'mouse.leftOnImage' }),
    },
    {
      label: formatMessage({ id: 'mouse.addOutLabel' }),
      key: formatMessage({ id: 'mouse.rightOnImage' }),
    },
    {
      label: formatMessage({ id: 'mouse.changeLabelPosition' }),
      key: formatMessage({ id: 'mouse.middleOnLabel' }),
    },
    {
      label: formatMessage({ id: 'mouse.deleteLabel' }),
      key: formatMessage({ id: 'mouse.rightOnLabel' }),
    },
  ];

  return (
    <div
      className={classNames('QuickCharacterHotKeyGuide', className)}
      css={css`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        user-select: none;
        z-index: 0;
        padding: 16px;
        opacity: 0.4;
      `}
    >
      <div
        className="QuickCharacterHotKeyGuide__Container"
        css={css`
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 360px;
          width: 100%;

          .GuideSection {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .GuideSection__Title {
            font-size: 11px;
            font-weight: 600;
            color: ${style.textColorSecondary};
            letter-spacing: 0.5px;
          }

          .GuideSection__Grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 5px 12px;
          }

          .GuideItem {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            line-height: 1.3;
          }

          .GuideItem__Label {
            color: ${style.textColorSecondary};
            flex-shrink: 0;
          }

          .GuideItem__Val {
            color: ${style.textColor};
            font-weight: 500;
            margin-left: 6px;
            text-align: right;
            white-space: nowrap;
          }

          .GuideItem__KeyBadges {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-left: 6px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .GuideItem__KeyBadge {
            background-color: ${style.backgroundColorLight};
            border: 1px solid ${style.borderColorBase};
            border-radius: 3px;
            padding: 0 4px;
            font-size: 10px;
            color: ${style.textColor};
            white-space: nowrap;
          }

          .GuideItem__KeyNone {
            color: ${style.textColorSecondaryLighter};
            font-size: 10px;
          }

          .GuideSection__SymbolsGrid {
            display: grid;
            grid-template-columns: repeat(4, minmax(60px, 1fr));
            gap: 5px 8px;
          }

          .GuideSymbolItem {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2px 5px;
            background-color: ${style.backgroundColorLight};
            border: 1px dashed ${style.borderColorBase};
            border-radius: ${style.borderRadiusSm};
            font-size: 11px;
            line-height: 1.2;
          }

          .GuideSymbolItem__Key {
            color: ${style.textColorSecondary};
            font-size: 10px;
            font-family: inherit;
          }

          .GuideSymbolItem__Char {
            color: ${style.textColor};
            font-weight: bold;
            font-size: 12px;
            margin-left: 4px;
          }
        `}
      >
        {/* 鼠标操作 */}
        <div className="GuideSection">
          <div className="GuideSection__Title">
            {formatMessage({ id: 'quickChar.mouseGuideTitle' })}
          </div>
          <div className="GuideSection__Grid">
            {mouseActions.map((item, index) => (
              <div key={index} className="GuideItem">
                <span className="GuideItem__Label">{item.label}</span>
                <span className="GuideItem__Val">{item.key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 常用快捷键 */}
        <div className="GuideSection">
          <div className="GuideSection__Title">
            {formatMessage({ id: 'quickChar.navHotKeyGuideTitle' })}
          </div>
          <div className="GuideSection__Grid">
            {navHotKeys.map((item) => (
              <div key={item.id} className="GuideItem">
                <span className="GuideItem__Label">{item.label}</span>
                <div className="GuideItem__KeyBadges">
                  {item.keys.length > 0 ? (
                    item.keys.map((keyStr, idx) => (
                      <span key={idx} className="GuideItem__KeyBadge">
                        {keyStr}
                      </span>
                    ))
                  ) : (
                    <span className="GuideItem__KeyNone">
                      {formatMessage({ id: 'hotKeyRecorder.null' })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 符号快捷键 */}
        {mappedSymbols.length > 0 && (
          <div className="GuideSection">
            <div className="GuideSection__Title">
              {formatMessage({ id: 'quickChar.hotKeyGuideTitle' })}
            </div>
            <div className="GuideSection__SymbolsGrid">
              {mappedSymbols.map((item, index) => (
                <div key={index} className="GuideSymbolItem">
                  <span className="GuideSymbolItem__Key">
                    {item.hotKey ? getHotKeyDisplayName(item.hotKey) : ''}
                  </span>
                  <span className="GuideSymbolItem__Char">
                    {item.character}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 设置页提示 */}
        <div
          className="GuideFooterTip"
          css={css`
            font-size: 11px;
            color: ${style.textColorSecondary};
            text-align: center;
            margin-top: 2px;
            line-height: 1.4;
          `}
        >
          {formatMessage({ id: 'quickChar.guideFooterTip' })}
        </div>
      </div>
    </div>
  );
};
