import { css } from '@emotion/core';
import { Button, Popconfirm, Tag, message } from 'antd';
import TextArea, { TextAreaRef } from 'antd/lib/input/TextArea';
import classNames from 'classnames';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { DebounceStatus } from '@/components';
import { api } from '@/apis';
import { TranslationUser } from '../TranslationUser';
import { APITranslation } from '@/apis/translation';
import { FC, File, InputDebounceStatus, Source as ISource } from '@/interfaces';
import { AppState } from '@/store';
import {
  batchSelectTranslationSaga,
  editMyTranslationSaga,
  editProofreadSaga,
  removeSourceTip,
  upsertSourceTip,
} from '@/store/source/slice';
import { focusTranslation } from '@/store/translation/slice';
import style from '@/style';
import { toLowerCamelCase } from '@/utils';
import { getBestTranslation } from '@/utils/source';
import { hover } from '@/utils/style';
import { Source } from './Source';
import { ProofreadSymbolPanel } from './SymbolPanel';
import { insertCharacterAtSelection } from '../quickCharacters';

/** 在批注框滑出时，用于触发它的字符 */
const TIP_TRIGGER_CHARACTER = '_';

/** 校对模式的属性接口 */
interface ImageSourceViewerProofreaderProps {
  file?: File;
  sources: ISource[];
  targetID: string;
  className?: string;
  readOnly?: boolean;
}
/**
 * 校对模式
 */
export const ImageSourceViewerProofreader: FC<
  ImageSourceViewerProofreaderProps
> = ({ file, sources, targetID, className, readOnly = false }) => {
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();
  const platform = useSelector((state: AppState) => state.site.platform);
  const isMobile = platform === 'mobile';
  const autoFocusInput = useSelector(
    (state: AppState) => state.site.imageTranslatorAutoFocusInput,
  );
  const domRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bottomDomRef = useRef<HTMLDivElement>(null);
  const functionBarDomRef = useRef<HTMLDivElement>(null);
  const proofreaderWrapperDomRef = useRef<HTMLDivElement>(null);
  const translationTextAreaRef = useRef<TextAreaRef>(null);
  const proofreadTextAreaRef = useRef<TextAreaRef>(null);
  const tipTextAreaRef = useRef<TextAreaRef>(null);
  const [activeInput, setActiveInput] = useState<'translation' | 'proofread'>(
    'proofread',
  );
  /** 滑出的批注框，null 表示未滑出 */
  const [tipDraft, setTipDraft] = useState<{
    translationID: string;
    /** 触发字符在校对内容中的位置，确认批注时要删掉它 */
    index: number;
    content: string;
    /** 已有批注的 id，有值时表示编辑已有批注 */
    tipID?: string;
  } | null>(null);
  /** 符号面板是否滑出 */
  const [symbolsVisible, setSymbolsVisible] = useState(false);
  const currentUser = useSelector((state: AppState) => state.user);
  const batchSelecting = useSelector(
    (state: AppState) => state.source.batchSelecting,
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
  const focusedSourceIndex = sources.findIndex(
    (source) => source.id === focusedSourceID,
  );
  const focusedTranslationID = useSelector(
    (state: AppState) => state.translation.focusedTranslation.id,
  );
  const focusedSource = sources.find((source) => source.id === focusedSourceID);
  const focusedSourceCreating = focusedSource?.labelStatus === 'creating';
  const focusedSourceDeleting = focusedSource?.labelStatus === 'deleting';
  let focusedSourceAllTranslations: APITranslation[] = [];
  if (focusedSource?.translations) {
    focusedSourceAllTranslations = [...focusedSource.translations];
  }
  if (focusedSource?.myTranslation) {
    focusedSourceAllTranslations.push(focusedSource.myTranslation);
  }
  const focusedTranslation = focusedSourceAllTranslations.find(
    (translation) => translation.id === focusedTranslationID,
  );
  const isMyTranslation = focusedTranslation?.user?.id === currentUser.id;
  const isNoTranslation =
    !!focusedSourceID &&
    (!focusedTranslationID ||
      (focusedTranslation?.content === '' &&
        focusedTranslation?.proofreadContent === ''));

  let mergedStatus: InputDebounceStatus | undefined;
  const isMergedStatus = (status: InputDebounceStatus | undefined) =>
    focusedSource?.proodreadContentStatuses[focusedTranslationID] === status ||
    ((isMyTranslation || isNoTranslation) &&
      focusedSource?.myTranslationContentStatus === status);
  if (isMergedStatus('saveFailed')) {
    mergedStatus = 'saveFailed';
  } else if (isMergedStatus('debouncing')) {
    mergedStatus = 'debouncing';
  } else if (isMergedStatus('saving')) {
    mergedStatus = 'saving';
  } else if (isMergedStatus('saveSuccessful')) {
    mergedStatus = 'saveSuccessful';
  } else {
    mergedStatus = undefined;
  }

  const responsiveHeight = isMobile ? 100 : 290;

  const bottomHeight = responsiveHeight;

  const isNoTranslationRef = useRef(isNoTranslation);
  isNoTranslationRef.current = isNoTranslation;
  useEffect(() => {
    if (autoFocusInput && focusedSourceEffects.includes('focusInput')) {
      setTimeout(() => {
        if (isNoTranslationRef.current) {
          translationTextAreaRef.current?.focus({ cursor: 'end' });
        } else {
          proofreadTextAreaRef.current?.focus({ cursor: 'end' });
        }
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
    const content = e.target.value;
    if (content === '' && !focusedTranslation?.proofreadContent) {
      dispatch(focusTranslation({ id: '' }));
    }
    dispatch(
      editMyTranslationSaga({
        sourceID: focusedSourceID,
        targetID,
        content,
        focus: true,
      }),
    );
  };

  const handleProofreadContentChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const proofreadContent = e.target.value;
    const previousContent = focusedTranslation?.proofreadContent || '';
    // 只有新插入单个触发字符时才滑出批注框，粘贴多字符、替换选区都不触发
    const caret =
      typeof e.target.selectionStart === 'number'
        ? e.target.selectionStart
        : null;
    if (
      caret !== null &&
      proofreadContent.length === previousContent.length + 1 &&
      proofreadContent[caret - 1] === TIP_TRIGGER_CHARACTER
    ) {
      // 每个校对对每个标签只能有一条批注，已有批注时读取出来编辑
      const myExistingTip = focusedSource?.tips.find(
        (tip) => tip.user?.id === currentUser.id,
      );
      setTipDraft((previousDraft) => ({
        translationID: focusedTranslationID,
        index: caret - 1,
        content: myExistingTip
          ? myExistingTip.content
          : previousDraft?.translationID === focusedTranslationID
            ? previousDraft.content
            : '',
        tipID: myExistingTip?.id,
      }));
    } else if (tipDraft) {
      // 内容变化后光标不再紧跟在触发字符后面时，收回批注框
      const stillAfterTrigger =
        caret !== null &&
        tipDraft.translationID === focusedTranslationID &&
        caret === tipDraft.index + 1 &&
        proofreadContent[tipDraft.index] === TIP_TRIGGER_CHARACTER;
      if (!stillAfterTrigger) {
        setTipDraft(null);
      }
    }
    dispatch(
      editProofreadSaga({
        sourceID: focusedSourceID,
        translationID: focusedTranslationID,
        proofreadContent,
      }),
    );
  };

  /** 光标离开触发字符后面时收回批注框 */
  const handleProofreadSelect = (
    e: React.SyntheticEvent<HTMLTextAreaElement>,
  ) => {
    if (!tipDraft) {
      return;
    }
    const textArea = e.currentTarget;
    const caret = textArea.selectionStart;
    if (
      tipDraft.translationID !== focusedTranslationID ||
      caret !== textArea.selectionEnd ||
      caret !== tipDraft.index + 1 ||
      textArea.value[tipDraft.index] !== TIP_TRIGGER_CHARACTER
    ) {
      setTipDraft(null);
    }
  };

  /** 批注框是否处于滑出状态 */
  const tipVisible =
    !!tipDraft && tipDraft.translationID === focusedTranslationID && !readOnly;

  // 校对区顶部相对底部面板顶部的距离。
  // 批注框起点要藏在校对区后面，展开时滑到面板顶部。
  const [tipRise, setTipRise] = useState(0);
  /** 按钮行高度：批注框展开后顶边要正好落在它下沿，不压住按钮 */
  const [functionBarHeight, setFunctionBarHeight] = useState(0);
  const tipHeight = isMobile ? 52 : 64;
  // 起点位置：先尽量对准校对区顶部，让批注框整个藏在校对框后面；
  // 若校对区比批注框还矮（PC 端译文区占得高），改贴面板底部，
  // 否则批注框会伸到面板外面，动画一开场就是悬空的
  const tipStart = Math.min(
    tipRise,
    Math.max(bottomHeight - tipHeight, 0),
  );
  // 终点位置：顶边对齐按钮行下沿。
  // 移动端面板只有 100px（按钮 28 + 校对区 72），放不下整条，
  // 改成底边贴按钮行下沿、向上探出 24px，否则会被校对区整个盖住
  const tipEnd = isMobile
    ? functionBarHeight - tipHeight + 24
    : functionBarHeight;
  useLayoutEffect(() => {
    const bottom = bottomDomRef.current;
    const wrapper = proofreaderWrapperDomRef.current;
    if (!bottom || !wrapper) return undefined;
    const measure = () => {
      const next =
        wrapper.getBoundingClientRect().top - bottom.getBoundingClientRect().top;
      setTipRise((previous) =>
        Math.abs(previous - next) < 1 ? previous : next,
      );
      const bar = functionBarDomRef.current;
      if (bar) {
        const nextBarHeight = bar.offsetHeight;
        setFunctionBarHeight((previous) =>
          previous === nextBarHeight ? previous : nextBarHeight,
        );
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bottom);
    observer.observe(wrapper);
    if (functionBarDomRef.current) {
      observer.observe(functionBarDomRef.current);
    }
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
    // Bottom 是在 focusedSource 存在时才挂载的，必须等它出现后再量一次，
    // 否则 PC 端量不到、tipRise 停在 0，批注框会变成从面板顶部闪现
  }, [focusedSourceID, isNoTranslation, readOnly]);

  // 批注框与符号面板都贴着底部面板滑出，同时出现会互相遮挡，批注优先
  useEffect(() => {
    if (tipVisible) {
      setSymbolsVisible(false);
    }
  }, [tipVisible]);

  const handleTipRequestError = (error: unknown) => {
    if (
      error &&
      typeof error === 'object' &&
      'default' in error &&
      typeof error.default === 'function'
    ) {
      error.default();
      return;
    }
    message.error(formatMessage({ id: 'site.networkError' }));
  };

  /** 确认批注：提交或删除批注，并删掉校对内容里的触发字符 */
  const submitTipDraft = () => {
    if (!tipDraft) {
      return;
    }
    const content = tipDraft.content.trim();
    const { translationID, index, tipID } = tipDraft;

    if (translationID === focusedTranslationID) {
      const currentContent = focusedTranslation?.proofreadContent || '';
      if (currentContent[index] === TIP_TRIGGER_CHARACTER) {
        dispatch(
          editProofreadSaga({
            sourceID: focusedSourceID,
            translationID,
            proofreadContent:
              currentContent.slice(0, index) + currentContent.slice(index + 1),
          }),
        );
      }
    }

    if (content) {
      const request = tipID
        ? api.tip.editTip({ tipID, data: { content } })
        : api.tip.createTip({
            sourceID: focusedSourceID,
            data: { content, targetID },
          });
      request
        .then((result) => {
          dispatch(
            upsertSourceTip({
              sourceID: focusedSourceID,
              tip: toLowerCamelCase(result.data),
            }),
          );
          message.success(
            formatMessage({ id: 'imageTranslator.proofreadTipAdded' }),
          );
        })
        .catch(handleTipRequestError);
    } else if (tipID) {
      // 提交空白表示删除已有批注
      api.tip
        .deleteTip({ tipID })
        .then(() => {
          dispatch(removeSourceTip({ sourceID: focusedSourceID, tipID }));
          message.success(
            formatMessage({ id: 'imageTranslator.proofreadTipDeleted' }),
          );
        })
        .catch(handleTipRequestError);
    }

    setTipDraft(null);
    requestAnimationFrame(() => {
      proofreadTextAreaRef.current?.focus({ cursor: 'end' });
    });
  };

  const cloneTranslationContent = () => {
    if (focusedTranslation?.content) {
      handleProofreadContentChange({
        target: {
          value: focusedTranslation.content,
        },
      } as any as React.ChangeEvent<HTMLTextAreaElement>);
    }
  };

  const insertQuickCharacter = (character: string) => {
    const useTranslationInput =
      isNoTranslation || (activeInput === 'translation' && isMyTranslation);
    const textAreaRef = useTranslationInput
      ? translationTextAreaRef
      : proofreadTextAreaRef;
    const textArea = textAreaRef.current?.resizableTextArea?.textArea;
    const result = insertCharacterAtSelection(
      useTranslationInput
        ? focusedTranslation?.content || ''
        : focusedTranslation?.proofreadContent || '',
      textArea?.selectionStart ?? null,
      textArea?.selectionEnd ?? null,
      character,
    );

    if (useTranslationInput) {
      handleTranslationContentChange({
        target: { value: result.value },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    } else {
      handleProofreadContentChange({
        target: { value: result.value },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    }
    requestAnimationFrame(() => {
      textArea?.focus();
      textArea?.setSelectionRange(result.cursor, result.cursor);
    });
  };

  const batchSelectTranslation = () => {
    const sourceTranslationIDMap: Array<{
      sourceID: string;
      translationID: string;
    }> = [];
    for (const source of sources) {
      const bestTranslation = getBestTranslation(source);
      if (bestTranslation && !bestTranslation.selected) {
        sourceTranslationIDMap.push({
          sourceID: source.id,
          translationID: bestTranslation.id,
        });
      }
    }
    if (sourceTranslationIDMap.length > 0) {
      dispatch(
        batchSelectTranslationSaga({
          fileID: file!.id,
          data: sourceTranslationIDMap,
        }),
      );
    }
  };

  return (
    <div
      className={classNames(['ImageSourceViewerProofreader', className])}
      css={css`
        height: 100%;
        .ImageSourceViewerProofreader__TranslationsWrapper {
          position: relative;
          height: calc(100% - ${bottomHeight}px);
          overflow: hidden;
        }
        .ImageSourceViewerProofreader__Translations {
          position: relative;
          z-index: 1;
          height: 100%;
          overflow-y: auto;
        }
        .ImageSourceViewerProofreader__TranslationsBottom {
          padding: 10px 0;
          background-color: ${style.backgroundColorLight};
        }
        .ImageSourceViewerProofreader__TranslationsButtons {
          text-align: center;
        }
        .ImageSourceViewerProofreader__TranslationsButtonsTip {
          text-align: center;
          margin-top: 5px;
          font-size: 12px;
          color: ${style.textColorSecondary};
        }
        .ImageSourceViewerProofreader__Bottom {
          position: relative;
          isolation: isolate;
          /* 高于译文列表（z-index 1）：批注框与符号面板上滑探出面板时，
             要盖住上方的 label 列表 */
          z-index: 2;
          display: flex;
          flex-direction: column;
          height: ${bottomHeight}px;
          border-top: 3px solid ${style.borderColorBase};
        }
        .ImageSourceViewerProofreader__Bottom--noTranslation {
          .ImageSourceViewerProofreader__TranslationArea {
            flex: auto;
            max-height: none;
          }
          .ImageSourceViewerProofreader__FunctionBar,
          .ImageSourceViewerProofreader__TranslationArea {
            background-color: ${style.backgroundColorLight};
          }
          .ImageSourceViewerProofreader__AreaLine,
          .ImageSourceViewerProofreader__ProofreaderWrapper {
            display: none;
          }
        }
        .ImageSourceViewerProofreader__Bottom--disabled {
          cursor: not-allowed;
          background-color: ${style.backgroundColorLight};
        }
        .ImageSourceViewerProofreader__Bottom--myTranslation {
          .ImageSourceViewerProofreader__FunctionBar,
          .ImageSourceViewerProofreader__TranslationArea {
            background-color: ${style.backgroundColorLight};
          }
        }
        .ImageSourceViewerProofreader__FunctionBar {
          position: relative;
          /* 层级 1：夹在符号面板/译文区（0）与批注框（2）之间——
             面板上滑时头藏在按钮后面，批注框上滑时又盖过按钮 */
          z-index: 1;
          padding: 5px 5px 0;
          background-color: ${style.backgroundColorLight};
          display: flex;
          justify-content: space-between;
        }
        .ImageSourceViewerProofreader__FunctionBarButtons {
          display: flex;
          align-items: center;
        }
        .ImageSourceViewerProofreader__FunctionBarButton {
          margin-right: 6px;
          &,
          button {
            background-color: ${style.backgroundColorLight};
            color: ${style.textColorSecondary};
            border: 1px solid ${style.borderColorBase};
            border-radius: ${style.borderRadiusSm};
            cursor: pointer;
            ${hover(css`
              background-color: ${style.hoverColor};
            `)};
          }
          &.ant-popover-disabled-compatible-wrapper {
            border: none;
          }
          &.ImageSourceViewerProofreader__FunctionBarButton--active,
          &.ImageSourceViewerProofreader__FunctionBarButton--active button {
            border-color: ${style.primaryColor};
            color: ${style.primaryColor};
          }
        }
        .ImageSourceViewerProofreader__TranslationArea {
          position: relative;
          z-index: 0;
          display: ${isMobile ? 'none' : 'block'};
          max-height: 78px;
          overflow-y: auto;
          background-color: ${style.backgroundColorLight};
        }
        .ImageSourceViewerProofreader__AreaLine {
          display: ${isMobile ? 'none' : 'block'};
          height: 0;
          margin-left: 11px;
          border-bottom: 1px dashed ${style.borderColorBase};
        }
        .ImageSourceViewerProofreader__ProofreaderWrapper {
          position: relative;
          display: flex;
          flex: auto;
          min-height: 0;
          width: 100%;
          /* 不创建独立图层，让批注能覆盖上方的译文和符号栏。 */
          overflow: visible;
        }
        .ImageSourceViewerProofreader__ProofreaderArea {
          position: relative;
          /* 层级 3：最高。校对区始终盖住藏在后面的批注与符号面板 */
          z-index: 3;
          flex: auto;
          width: 100%;
          overflow-y: auto;
          /* 校对区始终盖住藏在后面的批注，包括其中的文字和阴影。 */
          background-color: ${style.backgroundColorLight};
        }
        .ImageSourceViewerProofreader__TranslationUser {
          position: absolute;
          top: 6px;
          left: 11px;
          z-index: 1;
          pointer-events: none;
        }
        .ImageSourceViewerProofreader__TextDisplay {
          text-indent: 18px;
          white-space: pre-wrap;
          word-break: break-all;
          padding: 7px 11px;
          min-height: 36px;
        }
        .ImageSourceViewerProofreader__TextDisplay--hasAvatar {
          text-indent: 38px;
        }
        .ImageSourceViewerProofreader__TextArea {
          text-indent: 18px;
          border-radius: 0;
          border-width: 0;
          padding: ${isMobile ? '7px 11px 0' : '7px 11px'};
          min-height: 100%;
          resize: none;
          &.ant-input {
            border-right-width: 0px !important;
            outline: 0;
            box-shadow: none;
            background: transparent !important;
            background-color: transparent !important;
          }
          &.ant-input[disabled] {
            background: transparent !important;
            background-color: transparent !important;
          }
          &.ImageSourceViewerProofreader__TextArea--hasAvatar {
            text-indent: 38px;
          }
        }
        .ImageSourceViewerProofreader__TextArea--hasAvatar {
          text-indent: 38px;
        }
        .ImageSourceViewerProofreader__TipArea {
          position: absolute;
          /* __Bottom 的直接子元素，top: 0 即面板顶边；
             实际起点由 transform 下移到校对区处（见 tipRise） */
          top: 0;
          right: 0;
          left: 0;
          /* 层级 2：盖住按钮行（1）与译文区/符号面板（0），
             只被校对区（3）盖住 */
          z-index: 2;
          display: flex;
          flex-direction: column;
          height: ${isMobile ? 52 : 64}px;
          background-color: ${style.backgroundColorLight};
          /* 半透明，露出下方的译文与符号栏，同时保持文字可读 */
          background-color: color-mix(
            in srgb,
            ${style.backgroundColorLight} 86%,
            transparent
          );
          border-top: 1px solid ${style.borderColorBase};
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
          /* 起点对准校对区，整个藏在校对区（z-index 3）后面 */
          transform: translateY(${tipStart}px);
          visibility: hidden;
          transition:
            transform 0.24s ease-out,
            visibility 0s 0.24s;
          pointer-events: none;
        }
        .ImageSourceViewerProofreader__TipArea--visible {
          /* 停在按钮行下沿：按钮完整露出，下方紧接批注框，整条都在面板内 */
          transform: translateY(${tipEnd}px);
          visibility: visible;
          transition:
            transform 0.24s ease-out,
            visibility 0s;
          pointer-events: auto;
        }
        .ImageSourceViewerProofreader__TipTag {
          /* 与校对区的头像、图标一样，浮在输入框开头占位 */
          position: absolute;
          top: 5px;
          left: 11px;
          z-index: 1;
          margin: 0;
          padding: 0 5px;
          font-size: 11px;
          line-height: 16px;
          color: ${style.textColorLight};
          background-color: ${style.hoverColor};
          border-color: ${style.borderColorBase};
          border-radius: ${style.borderRadiusSm};
          pointer-events: none;
        }
        .ImageSourceViewerProofreader__TipTextArea {
          flex: auto;
          /* 让开开头的批注标签 */
          text-indent: 38px;
          border-radius: 0;
          border-width: 0;
          padding: 4px 11px 6px;
          resize: none;
          &.ant-input {
            border-right-width: 0px !important;
            outline: 0;
            box-shadow: none;
            background: transparent !important;
            background-color: transparent !important;
          }
        }
        .ImageSourceViewerProofreader__SymbolArea {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          /* 层级 0，与译文区同层（DOM 靠后所以盖得住它），低于按钮行（1）：
             上滑时头从按钮后面探出，永远盖不住按钮 */
          z-index: 0;
          max-height: 96px;
          overflow-y: auto;
          border-top: 1px solid ${style.borderColorBase};
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
          /* 半透明，露出下方的校对内容 */
          background-color: color-mix(
            in srgb,
            ${style.backgroundColorLight} 86%,
            transparent
          );
          /* 起点与按钮条重叠、藏在它后面（按钮 z-index 1 更高，压得住）；
             打开时向上抽出一整条，探出底部面板、盖住上方的 label 列表 */
          transform: translateY(0);
          visibility: hidden;
          transition:
            transform 0.18s ease-out,
            visibility 0s 0.18s;
          pointer-events: none;
        }
        .ImageSourceViewerProofreader__SymbolArea--visible {
          transform: translateY(-100%);
          visibility: visible;
          transition:
            transform 0.18s ease-out,
            visibility 0s;
          pointer-events: auto;
        }
      `}
    >
      <div className="ImageSourceViewerProofreader__TranslationsWrapper">
        <div className="ImageSourceViewerProofreader__Translations">
          {sources.map((source, index) => (
            <Source
              ref={(ref) => (domRefs.current[index] = ref)}
              source={source}
              index={index}
              key={source.id}
              targetID={targetID}
              readOnly={readOnly}
            />
          ))}
          {!readOnly && file && sources.length > 0 && (
            <div className="ImageSourceViewerProofreader__TranslationsBottom">
              <div className="ImageSourceViewerProofreader__TranslationsButtons">
                <Button
                  loading={batchSelecting}
                  className="ImageSourceViewerProofreader__TranslationsButton"
                  onClick={batchSelectTranslation}
                >
                  {formatMessage({ id: 'imageTranslator.checkAllTranslation' })}
                </Button>
              </div>
              <div className="ImageSourceViewerProofreader__TranslationsButtonsTip">
                {formatMessage({
                  id: 'imageTranslator.checkAllTranslationTip',
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {focusedSource && (
        <div
          ref={bottomDomRef}
          className={classNames('ImageSourceViewerProofreader__Bottom', {
            'ImageSourceViewerProofreader__Bottom--disabled':
              focusedSourceCreating || focusedSourceDeleting,
            'ImageSourceViewerProofreader__Bottom--noTranslation':
              isNoTranslation,
            'ImageSourceViewerProofreader__Bottom--myTranslation':
              isMyTranslation,
          })}
        >
          <div
            ref={functionBarDomRef}
            className="ImageSourceViewerProofreader__FunctionBar"
          >
            <div className="ImageSourceViewerProofreader__FunctionBarButtons">
              {!readOnly && (
                <Popconfirm
                  title={formatMessage({
                    id: 'translation.copyToProofreadNotEmptyTip',
                  })}
                  onConfirm={cloneTranslationContent}
                  okText={formatMessage({ id: 'translation.cover' })}
                  cancelText={formatMessage({ id: 'site.cancel' })}
                  disabled={!focusedTranslation?.proofreadContent}
                  placement={isMobile ? 'topLeft' : 'top'}
                >
                  <button
                    type="button"
                    className="ImageSourceViewerProofreader__FunctionBarButton"
                    onClick={() => {
                      if (!focusedTranslation?.proofreadContent) {
                        cloneTranslationContent();
                      }
                    }}
                    disabled={
                      focusedSourceCreating ||
                      focusedSourceDeleting ||
                      isNoTranslation
                    }
                  >
                    {formatMessage({
                      id: 'imageTranslator.copyTranslationContent',
                    })}
                  </button>
                </Popconfirm>
              )}
              {!readOnly && (
                <button
                  type="button"
                  className={classNames(
                    'ImageSourceViewerProofreader__FunctionBarButton',
                    {
                      'ImageSourceViewerProofreader__FunctionBarButton--active':
                        symbolsVisible,
                    },
                  )}
                  onClick={() => setSymbolsVisible((previous) => !previous)}
                  disabled={
                    focusedSourceCreating ||
                    focusedSourceDeleting ||
                    isNoTranslation
                  }
                >
                  {formatMessage({ id: 'imageTranslator.specialSymbols' })}
                </button>
              )}
            </div>
            <DebounceStatus
              className="ImageSourceViewerProofreader__DebounceStatus"
              status={mergedStatus}
            />
          </div>
          <div className="ImageSourceViewerProofreader__TranslationArea">
            <TranslationUser
              className="ImageSourceViewerProofreader__TranslationUser"
              iconType="translation"
              avatar={focusedTranslation?.user?.avatar}
            />
            {isMyTranslation || isNoTranslation ? (
              <TextArea
                autoSize
                className={classNames(
                  'ImageSourceViewerProofreader__TextArea',
                  {
                    'ImageSourceViewerProofreader__TextArea--hasAvatar':
                      focusedTranslation?.user?.avatar,
                  },
                )}
                onChange={readOnly ? undefined : handleTranslationContentChange}
                onFocus={() => setActiveInput('translation')}
                value={focusedTranslation?.content}
                placeholder={
                  focusedSourceCreating
                    ? formatMessage({ id: 'imageTranslator.sourceCreating' })
                    : focusedSourceDeleting
                      ? formatMessage({ id: 'imageTranslator.sourceDeleting' })
                      : formatMessage({
                          id: 'imageTranslator.translationPlaceholder',
                        })
                }
                // 新创建翻译时，focusedTranslation 会是一个 id 为空的虚拟对象，所以这里用 focusedTranslationID 判断
                disabled={
                  !readOnly &&
                  (focusedSourceCreating ||
                    focusedSourceDeleting ||
                    focusedSource.proodreadContentStatuses[
                      focusedTranslation?.id || ''
                    ] === 'saving' ||
                    focusedSource.proodreadContentStatuses[
                      focusedTranslation?.id || ''
                    ] === 'debouncing')
                }
                readOnly={readOnly}
                ref={translationTextAreaRef}
              ></TextArea>
            ) : (
              <div
                className={classNames(
                  'ImageSourceViewerProofreader__TextDisplay',
                  {
                    'ImageSourceViewerProofreader__TextDisplay--hasAvatar':
                      focusedTranslation?.user?.avatar,
                  },
                )}
              >
                {focusedTranslation?.content}
              </div>
            )}
          </div>
          <div className="ImageSourceViewerProofreader__AreaLine" />
          <div
            ref={proofreaderWrapperDomRef}
            className="ImageSourceViewerProofreader__ProofreaderWrapper"
          >
            <div className="ImageSourceViewerProofreader__ProofreaderArea">
              <TranslationUser
                className="ImageSourceViewerProofreader__TranslationUser"
                iconType="proofread"
                avatar={focusedTranslation?.proofreader?.avatar}
              />
              <TextArea
                autoSize
                className={classNames(
                  'ImageSourceViewerProofreader__TextArea',
                  {
                    'ImageSourceViewerProofreader__TextArea--hasAvatar':
                      focusedTranslation?.proofreader?.avatar,
                  },
                )}
                onChange={readOnly ? undefined : handleProofreadContentChange}
                onSelect={handleProofreadSelect}
                onFocus={() => setActiveInput('proofread')}
                onKeyDown={(e) => {
                  // 批注框滑出时，上下键不再用于文本内换行/移动，改为切换输入框
                  if (!tipVisible) {
                    return;
                  }
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    tipTextAreaRef.current?.focus();
                  }
                }}
                value={focusedTranslation?.proofreadContent}
                placeholder={
                  focusedSourceCreating
                    ? formatMessage({ id: 'imageTranslator.sourceCreating' })
                    : focusedSourceDeleting
                      ? formatMessage({ id: 'imageTranslator.sourceDeleting' })
                      : isNoTranslation
                        ? formatMessage({
                            id: 'imageTranslator.noTranslationForProofread',
                          })
                        : formatMessage({
                            id: 'imageTranslator.proofreadPlaceholder',
                          })
                }
                // 新创建翻译时，focusedTranslation 会是一个 id 为空的虚拟对象，所以这里用 focusedTranslationID 判断
                disabled={
                  !readOnly &&
                  (focusedSourceCreating ||
                    focusedSourceDeleting ||
                    isNoTranslation ||
                    focusedSource.myTranslationContentStatus === 'saving' ||
                    focusedSource.myTranslationContentStatus === 'debouncing')
                }
                readOnly={readOnly}
                ref={proofreadTextAreaRef}
              ></TextArea>
            </div>
          </div>
          {!readOnly && !isNoTranslation && (
            <div
              className={classNames('ImageSourceViewerProofreader__TipArea', {
                'ImageSourceViewerProofreader__TipArea--visible': tipVisible,
              })}
            >
              <Tag className="ImageSourceViewerProofreader__TipTag">
                {formatMessage({ id: 'imageTranslator.tipLabel' })}
              </Tag>
              <TextArea
                className="ImageSourceViewerProofreader__TipTextArea"
                ref={tipTextAreaRef}
                value={tipDraft?.content || ''}
                onChange={(e) => {
                  const content = e.target.value;
                  setTipDraft((previousDraft) =>
                    previousDraft
                      ? { ...previousDraft, content }
                      : previousDraft,
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    proofreadTextAreaRef.current?.focus({ cursor: 'end' });
                    return;
                  }
                  if (e.key === 'Escape') {
                    // 取消批注：保留校对内容里的字符，也不提交
                    e.preventDefault();
                    setTipDraft(null);
                    proofreadTextAreaRef.current?.focus({ cursor: 'end' });
                    return;
                  }
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    submitTipDraft();
                  }
                }}
                placeholder={formatMessage({
                  id: tipDraft?.tipID
                    ? 'imageTranslator.proofreadTipEditPlaceholder'
                    : 'imageTranslator.proofreadTipPlaceholder',
                })}
                tabIndex={tipVisible ? 0 : -1}
              ></TextArea>
            </div>
          )}
          {!readOnly && (
            <div
              className={classNames(
                'ImageSourceViewerProofreader__SymbolArea',
                {
                  'ImageSourceViewerProofreader__SymbolArea--visible':
                    symbolsVisible,
                },
              )}
            >
              <ProofreadSymbolPanel
                disabled={
                  focusedSourceCreating ||
                  focusedSourceDeleting ||
                  focusedSource.myTranslationContentStatus === 'saving' ||
                  focusedSource.myTranslationContentStatus === 'debouncing'
                }
                onInsert={insertQuickCharacter}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
