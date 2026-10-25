import { css } from '@emotion/core';
import TextArea, { TextAreaRef } from 'antd/lib/input/TextArea';
import classNames from 'classnames';
import React, { useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { DebounceStatus, Icon, Tooltip } from '@/components';
import { APITranslation } from '@/apis/translation';
import { PROJECT_PERMISSION } from '@/constants';
import { FC, Source as ISource } from '@/interfaces';
import { AppState } from '@/store';
import { editMyTranslationSaga, focusSource } from '@/store/source/slice';
import style from '@/style';
import { getBestTranslation } from '@/utils/source';
import { clickEffect, hover } from '@/utils/style';
import { can } from '@/utils/user';
import {
  BottomDragHandle,
  useBottomHeightResize,
} from '../BottomDragHandle';
import { FunctionBarButton } from '../FunctionBarButton';
import {
  SymbolPanelStrip,
  useSymbolPanelVisible,
} from '../SymbolPanelStrip';
import { insertCharacterAtSelection } from '../quickCharacters';

/** 翻译模式的属性接口 */
interface ImageSourceViewerTranslatorProps {
  sources: ISource[];
  targetID: string;
  className?: string;
  readOnly?: boolean;
}
/**
 * "translate" model, the panel to fill in text 翻译模式
 */
export const ImageSourceViewerTranslator: FC<
  ImageSourceViewerTranslatorProps
> = ({ sources, targetID, className, readOnly = false }) => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const platform = useSelector((state: AppState) => state.site.platform);
  const isMobile = platform === 'mobile';
  const autoFocusInput = useSelector(
    (state: AppState) => state.site.imageTranslatorAutoFocusInput,
  );
  const domRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textAreaRef = useRef<TextAreaRef>(null);
  const translationsDomRef = useRef<HTMLDivElement>(null);
  /** 符号面板是否展开（localStorage 持久化，三模式共用偏好） */
  const [symbolsVisible, setSymbolsVisible] = useSymbolPanelVisible();
  const currentProject = useSelector(
    (state: AppState) => state.project.currentProject,
  );
  const focusedSourceID = useSelector(
    (state: AppState) => state.source.focusedSource.id,
  );
  const focusedSourceEffects = useSelector(
    (state: AppState) => state.source.focusedSource.effects,
  );
  const focusedSourceNoiseFocusInput = useSelector(
    (state: AppState) => state.source.focusedSource.noises.focusInput,
  );
  const focusedSourceNoiseScrollIntoView = useSelector(
    (state: AppState) => state.source.focusedSource.noises.scrollIntoView,
  );
  let focusedSource: ISource | undefined = undefined;
  let focusedSourceIndex: number = -1;
  const myTranslations: (APITranslation | undefined)[] = [];
  const othersBestTranslations: (APITranslation | undefined)[] = [];
  for (let i = 0; i < sources.length; i++) {
    if (sources[i].id === focusedSourceID) {
      focusedSource = sources[i];
      focusedSourceIndex = i;
    }
    myTranslations.push(sources[i].myTranslation);
    othersBestTranslations.push(getBestTranslation(sources[i]));
  }
  const focusedSourceCreating = focusedSource?.labelStatus === 'creating';
  const focusedSourceDeleting = focusedSource?.labelStatus === 'deleting';

  const { bottomHeight: adjustedPanelHeight, dragHandlers } =
    useBottomHeightResize({ baseHeight: isMobile ? 100 : 240 });
  const bottomHeight = focusedSource ? adjustedPanelHeight : 0;

  useEffect(() => {
    if (autoFocusInput && focusedSourceEffects.includes('focusInput')) {
      setTimeout(() => {
        textAreaRef.current?.focus({ cursor: 'end' });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedSourceID, focusedSourceNoiseFocusInput, autoFocusInput]);

  useEffect(() => {
    if (focusedSourceEffects.includes('scrollIntoView')) {
      domRefs.current[focusedSourceIndex]?.scrollIntoView({
        block: 'end',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedSourceID, focusedSourceNoiseScrollIntoView]);

  const handleTranslationContentChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    dispatch(
      editMyTranslationSaga({
        sourceID: focusedSourceID,
        targetID,
        content: e.target.value,
      }),
    );
  };

  const insertQuickCharacter = (character: string) => {
    const textArea = textAreaRef.current?.resizableTextArea?.textArea;
    const result = insertCharacterAtSelection(
      focusedSource?.myTranslation?.content || '',
      textArea?.selectionStart ?? null,
      textArea?.selectionEnd ?? null,
      character,
    );
    dispatch(
      editMyTranslationSaga({
        sourceID: focusedSourceID,
        targetID,
        content: result.value,
      }),
    );
    requestAnimationFrame(() => {
      textArea?.focus();
      textArea?.setSelectionRange(result.cursor, result.cursor);
    });
  };

  return (
    <div
      className={classNames('ImageSourceViewerTranslator', className)}
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        .ImageSourceViewerTranslator__TranslationsWrapper {
          position: relative;
          /* 符号面板收展条在文档流中，呼出时把本区挤矮、列表整体上移 */
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
        }
        .ImageSourceViewerTranslator__Translations {
          position: relative;
          z-index: 1;
          height: 100%;
          overflow-y: auto;
        }
        .ImageSourceViewerTranslator__Translation {
          position: relative;
          z-index: 1;
          background-color: ${style.backgroundColorLight};
          display: flex;
          padding: 4px 5px;
          border-left: 5px solid ${style.borderColorLight};
          border-bottom: 1px solid ${style.borderColorBase};
          min-height: 30px;
          ${clickEffect()};
          ${hover(css`
            .ImageSourceViewerTranslator__TranslationContentOthersBest {
              color: ${style.textColor};
            }
            .ImageSourceViewerTranslator__TranslationContentOthersBestPrefixIcon {
              color: ${style.textColorSecondary};
            }
            .ImageSourceViewerTranslator__TranslationContentMine--hasProofread {
              color: ${style.textColor};
            }
          `)};
          :last-child {
            border-bottom: 0;
          }
        }
        .ImageSourceViewerTranslator__Translation--empty {
          border-left-color: ${style.primaryColorLightest};
        }
        .ImageSourceViewerTranslator__Translation--focus {
          background-color: ${style.backgroundFocus};
        }
        .ImageSourceViewerTranslator__TranslationIndex {
          flex: none;
          color: ${style.textColorSecondary};
          font-size: 14px;
          font-family: ${style.labelFontFamily};
          font-weight: 600;
          margin: 1px 6px 0 4px;
          min-width: 17px;
          text-align: center;
        }
        .ImageSourceViewerTranslator__SingleDebounceStatus {
          float: right;
          margin-right: 3px;
        }
        .ImageSourceViewerTranslator__TranslationContent {
          flex: auto;
          color: ${style.textColor};
        }
        .ImageSourceViewerTranslator__TranslationContentMine {
          width: 100%;
          min-height: 22px;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .ImageSourceViewerTranslator__TranslationContentMine--hasProofread {
          color: ${style.textColorSecondary};
        }
        .ImageSourceViewerTranslator__TranslationContentMineProofread {
          width: 100%;
          margin-top: 4px;
          padding-top: 4px;
           border-top: 1px dashed ${style.borderColorBase};
          white-space: pre-wrap;
          word-break: break-all;
        }
        .ImageSourceViewerTranslator__TranslationContentMineProofreadPrefix {
          margin-right: 4px;
        }
        .ImageSourceViewerTranslator__TranslationContentMineProofreadPrefixIcon {
          width: 12px;
          color: ${style.textColorSecondary};
        }
        .ImageSourceViewerTranslator__TranslationContentOthersBest {
          width: 100%;
          color: ${style.textColorSecondary};
          white-space: pre-wrap;
          word-break: break-all;
        }
        .ImageSourceViewerTranslator__TranslationContentOthersBestPrefix {
          margin-right: 4px;
        }
        .ImageSourceViewerTranslator__TranslationContentOthersBestPrefixIcon {
          width: 14px;
          color: ${style.textColorSecondaryLighter};
        }
        .ImageSourceViewerTranslator__Bottom {
          flex: none;
          display: flex;
          flex-direction: column;
          height: ${bottomHeight}px;
        }

        .ImageSourceViewerTranslator__FunctionBar {
          padding: 5px 5px 0;
          background-color: ${style.backgroundColorLight};
          display: flex;
        }
        .ImageSourceViewerTranslator__TextArea {
          flex: auto;
          width: 100%;
          border-radius: 0;
          border-width: 0;
          padding: 7px 11px;
          resize: none;
          &.ant-input {
            border-right-width: 0px !important;
            outline: 0;
            box-shadow: none;
          }
        }
        .ImageSourceViewerTranslator__StatusBar {
          background-color: ${style.backgroundColorLight};
          border-top: 1px solid ${style.borderColorBase};
          display: flex;
          padding: 0 5px;
        }
        .ImageSourceViewerTranslator__DebounceStatus {
          margin-left: auto;
        }
      `}
    >
      <div className="ImageSourceViewerTranslator__TranslationsWrapper">
        <div
          ref={translationsDomRef}
          className="ImageSourceViewerTranslator__Translations"
        >
        {myTranslations.map((myTranslation, i) => {
          const source = sources[i];
          const othersBestTranslation = othersBestTranslations[i];
          const myContent = myTranslation ? myTranslation.content : '';
          const myProofreadContent = myTranslation
            ? myTranslation.proofreadContent
            : '';
          let othersBestContent = '';
          if (othersBestTranslation) {
            othersBestContent = othersBestTranslation.proofreadContent
              ? othersBestTranslation.proofreadContent
              : othersBestTranslation.content;
          }
          const empty: boolean =
            !myContent && !myProofreadContent && !othersBestContent;

          return (
            <div
              ref={(ref) => (domRefs.current[i] = ref)}
              key={source.id}
              className={classNames(
                'ImageSourceViewerTranslator__Translation',
                {
                  'ImageSourceViewerTranslator__Translation--empty': empty,
                  'ImageSourceViewerTranslator__Translation--focus':
                    focusedSourceID === source.id,
                },
              )}
              onClick={() => {
                dispatch(
                  focusSource({
                    id: source.id,
                    effects: autoFocusInput
                      ? ['focusLabel', 'focusInput']
                      : ['focusLabel'],
                    noises: autoFocusInput ? ['focusInput'] : [],
                  }),
                );
              }}
            >
              <div className="ImageSourceViewerTranslator__TranslationIndex">
                {i + 1}
              </div>
              <div className="ImageSourceViewerTranslator__TranslationContent">
                {myContent || myProofreadContent ? (
                  <>
                    <div
                      className={classNames(
                        'ImageSourceViewerTranslator__TranslationContentMine',
                        {
                          'ImageSourceViewerTranslator__TranslationContentMine--hasProofread':
                            myProofreadContent,
                        },
                      )}
                    >
                      {myContent}
                      <DebounceStatus
                        className="ImageSourceViewerTranslator__SingleDebounceStatus"
                        status={source.myTranslationContentStatus}
                        tipVisible={false}
                      />
                    </div>
                    {myProofreadContent && (
                      <div className="ImageSourceViewerTranslator__TranslationContentMineProofread">
                        <Tooltip
                          title={formatMessage({
                            id: 'translation.proofreadFirstTip',
                          })}
                          placement="left"
                        >
                          <span className="ImageSourceViewerTranslator__TranslationContentMineProofreadPrefix">
                            <Icon
                              className="ImageSourceViewerTranslator__TranslationContentMineProofreadPrefixIcon"
                              icon="pen-nib"
                            />
                          </span>
                        </Tooltip>
                        {myProofreadContent}
                      </div>
                    )}
                  </>
                ) : (
                  othersBestContent && (
                    <div className="ImageSourceViewerTranslator__TranslationContentOthersBest">
                      <Tooltip
                        title={formatMessage({
                          id: 'translation.hasOthersBestContentTip',
                        })}
                        placement="left"
                      >
                        <span className="ImageSourceViewerTranslator__TranslationContentOthersBestPrefix">
                          <Icon
                            className="ImageSourceViewerTranslator__TranslationContentOthersBestPrefixIcon"
                            icon="user-check"
                          />
                        </span>
                      </Tooltip>
                      {othersBestContent}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      {focusedSourceIndex > -1 && !readOnly && (
        <SymbolPanelStrip
          visible={symbolsVisible}
          disabled={
            !can(currentProject, PROJECT_PERMISSION.ADD_TRA) ||
            focusedSourceCreating ||
            focusedSourceDeleting
          }
          onInsert={insertQuickCharacter}
          scrollContainerRef={translationsDomRef}
        />
      )}
      {focusedSourceIndex > -1 && (
        <div className="ImageSourceViewerTranslator__Bottom">
          <BottomDragHandle {...dragHandlers} />
          {!readOnly && (
            <div className="ImageSourceViewerTranslator__FunctionBar">
              <FunctionBarButton
                active={symbolsVisible}
                onClick={() =>
                  setSymbolsVisible((previous) => !previous)
                }
                disabled={
                  !can(currentProject, PROJECT_PERMISSION.ADD_TRA) ||
                  focusedSourceCreating ||
                  focusedSourceDeleting
                }
              >
                {formatMessage({ id: 'imageTranslator.specialSymbols' })}
              </FunctionBarButton>
            </div>
          )}
          <TextArea
            className="ImageSourceViewerTranslator__TextArea"
            onChange={readOnly ? undefined : handleTranslationContentChange}
            value={
              readOnly || can(currentProject, PROJECT_PERMISSION.ADD_TRA)
                ? focusedSource?.myTranslation?.content
                : formatMessage({
                    id: 'imageTranslator.translationNoPremissionPlaceholder',
                  })
            }
            placeholder={
              focusedSourceCreating
                ? formatMessage({ id: 'imageTranslator.sourceCreating' })
                : focusedSourceDeleting
                  ? formatMessage({ id: 'imageTranslator.sourceDeleting' })
                  : formatMessage({
                      id: 'imageTranslator.translationPlaceholder',
                    })
            }
            disabled={
              !readOnly &&
              (!can(currentProject, PROJECT_PERMISSION.ADD_TRA) ||
                focusedSourceCreating ||
                focusedSourceDeleting)
            }
            readOnly={readOnly}
            ref={textAreaRef}
          ></TextArea>
          <div className="ImageSourceViewerTranslator__StatusBar">
            <DebounceStatus
              className="ImageSourceViewerTranslator__DebounceStatus"
              status={focusedSource?.myTranslationContentStatus}
            />
          </div>
        </div>
      )}
    </div>
  );
};
