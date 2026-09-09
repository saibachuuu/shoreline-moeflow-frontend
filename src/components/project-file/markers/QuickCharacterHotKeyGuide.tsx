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
  const platform = useSelector((state: AppState) => state.site.platform);
  const isMobile = platform === 'mobile';
  const themeMode = useSelector((state: AppState) => state.site.themeMode);
  const mode = useSelector((state: AppState) => state.imageTranslator.mode);
  const isProofreadOrGodMode = mode === 'proofreader' || mode === 'god';
  const isVisibleMode =
    mode === 'translator' || mode === 'proofreader' || mode === 'god';
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
  const sendProofreadDraftOptions = useSelector(
    (state: AppState) => state.hotKey.sendProofreadDraft,
  );

  const mappedSymbols = quickCharacters.filter(
    (item) => item.hotKey && item.hotKey.key,
  );

  const formatOptions = (options: (HotKeyOption | undefined)[]) => {
    return (options || [])
      .filter((opt): opt is HotKeyOption => Boolean(opt && opt.key))
      .map((opt) => getHotKeyDisplayName(opt));
  };
  const sendHotKeyNames = formatOptions(sendProofreadDraftOptions);
  const hotKeyDisplay = sendHotKeyNames.length > 0 ? sendHotKeyNames[0] : '';

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
    ...(isProofreadOrGodMode
      ? [
          {
            id: 'sendProofreadDraft',
            label: formatMessage({ id: 'hotKey.sendProofreadDraft' }),
            keys: sendHotKeyNames,
          },
        ]
      : []),
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

  if (isMobile || !isVisibleMode) {
    return null;
  }

  const isDark = themeMode === 'dark';
  const textColor = isDark ? style.textColor : 'rgba(255, 255, 255, 0.85)';
  const textColorSecondary = isDark
    ? style.textColorSecondary
    : 'rgba(255, 255, 255, 0.55)';
  const textColorSecondaryLighter = isDark
    ? style.textColorSecondaryLighter
    : 'rgba(255, 255, 255, 0.35)';
  const badgeBg = isDark ? style.backgroundColorLight : 'rgba(0, 0, 0, 0.25)';
  const badgeBorder = isDark ? style.borderColorBase : 'rgba(255, 255, 255, 0.2)';

  return (
    <div
      className={classNames('QuickCharacterHotKeyGuide', className)}
      css={css`
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        right: 12px;
        width: 240px;
        max-width: calc(100% - 24px);
        max-height: calc(100% - 60px);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        pointer-events: none;
        user-select: none;
        z-index: 1;
        padding: 12px 14px;
        box-sizing: border-box;
        background-color: ${isDark
          ? 'rgba(25, 25, 25, 0.55)'
          : 'rgba(0, 0, 0, 0.35)'};
        border: 1px solid
          ${isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.22)'};
        border-radius: ${style.borderRadiusBase};
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(4px);
        opacity: 0.8;

        &::-webkit-scrollbar {
          width: 4px;
        }
        &::-webkit-scrollbar-thumb {
          background: ${isDark
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(255, 255, 255, 0.3)'};
          border-radius: 2px;
        }

        @media (max-width: 768px) {
          display: none !important;
        }
      `}
    >
      <div
        className="QuickCharacterHotKeyGuide__Container"
        css={css`
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 100%;
          width: 100%;

          .GuideSection {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .GuideSection__Title {
            font-size: 11px;
            font-weight: 600;
            color: ${textColorSecondary};
            letter-spacing: 0.5px;
          }

          .GuideSection__Grid {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .GuideItem {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            line-height: 1.3;
          }

          .GuideItem__Label {
            color: ${textColorSecondary};
            flex-shrink: 0;
          }

          .GuideItem__Val {
            color: ${textColor};
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
            background-color: ${badgeBg};
            border: 1px solid ${badgeBorder};
            border-radius: 3px;
            padding: 0 4px;
            font-size: 10px;
            color: ${textColor};
            white-space: nowrap;
          }

          .GuideItem__KeyNone {
            color: ${textColorSecondaryLighter};
            font-size: 10px;
          }

          .GuideSection__SymbolsGrid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 5px 6px;
          }

          .GuideSymbolItem {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2px 5px;
            background-color: ${badgeBg};
            border: 1px dashed ${badgeBorder};
            border-radius: ${style.borderRadiusSm};
            font-size: 11px;
            line-height: 1.2;
          }

          .GuideSymbolItem__Key {
            color: ${textColorSecondary};
            font-size: 10px;
            font-family: inherit;
          }

          .GuideSymbolItem__Char {
            color: ${textColor};
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
            color: ${textColorSecondary};
            text-align: center;
            margin-top: 2px;
            line-height: 1.4;
          `}
        >
          {isProofreadOrGodMode
            ? hotKeyDisplay
              ? formatMessage(
                  { id: 'quickChar.proofreadFeedbackGuideTip' },
                  { hotKey: `[${hotKeyDisplay}]` },
                )
              : formatMessage({ id: 'quickChar.proofreadFeedbackGuideTipNoKey' })
            : formatMessage({ id: 'quickChar.guideFooterTip' })}
        </div>
      </div>
    </div>
  );
};
