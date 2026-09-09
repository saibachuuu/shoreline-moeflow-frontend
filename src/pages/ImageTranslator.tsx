import { css, Global } from '@emotion/core';
import { Button, Checkbox, Divider, message, Modal, Slider, Switch } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { api } from '@/apis';
import { PROJECT_STATUS, normalizeProjectStatus } from '@/constants';
import { useHotKey } from '@/components';
import { ImageViewer, ImageSourceViewer } from '@/components/project-file';
import { FC, Source } from '@/interfaces';
import { AppState } from '@/store';
import { setCurrentProjectSaga } from '@/store/project/slice';
import {
  setImageTranslatorAutoFocusInput,
  setImageTranslatorImageDarkness,
  setThemeMode,
} from '@/store/site/slice';
import {
  fetchSourcesSaga,
  focusSource,
  FocusEffect,
} from '@/store/source/slice';
import style from '../style';
import { toLowerCamelCase } from '@/utils';
import { getCancelToken } from '@/utils/api';
import { imageTranslatorSettingsStorage } from '@/utils/storage';
import { useProjectHeartbeat, useTitle } from '@/hooks';
import {
  ImageTranslatorSettingMouse,
  ImageTranslatorSettingHotKey,
  ImageTranslatorSettingSymbol,
} from '@/components/project-file';
import { GetFileReturn } from '@/apis/file';

/**
 * 全屏显示的图片翻译器
 */
const ImageTranslator: FC = () => {
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();
  const { fileID, targetID } = useParams<{
    fileID: string;
    targetID: string;
  }>();
  const sources = useSelector((state: AppState) => state.source.sources);
  const sourcesLoading = useSelector((state: AppState) => state.source.loading);
  const focusedSourceID = useSelector(
    (state: AppState) => state.source.focusedSource.id,
  );
  const platform = useSelector((state: AppState) => state.site.platform);
  const themeMode = useSelector((state: AppState) => state.site.themeMode);
  const autoFocusInput = useSelector(
    (state: AppState) => state.site.imageTranslatorAutoFocusInput,
  );
  const isMobile = platform === 'mobile';
  const [file, setFile] = useState<GetFileReturn>();
  const sourceListWidth = 400;
  const sourceListHeightMobileDefault = 200;
  const sourceListHeightMobileMin = 100;
  const sourceListHeightMobileMax = 500;
  const [sourceListHeightMobile, setSourceListHeightMobile] = useState(
    sourceListHeightMobileDefault,
  );
  const [settingModalVisible, setSettingModalVisible] = useState(false);
  const imageDarkness = useSelector(
    (state: AppState) => state.site.imageTranslatorImageDarkness,
  );
  const currentProject = useSelector(
    (state: AppState) => state.project.currentProject,
  );
  const projectReadOnly = normalizeProjectStatus(currentProject?.status) !== PROJECT_STATUS.NORMAL;
  const [ccMyself, setCcMyself] = useState<boolean>(() => {
    const saved = localStorage.getItem('proofread_draft_cc_myself');
    return saved === null ? true : saved === 'true';
  });
  const [sendingProofreadDraft, setSendingProofreadDraft] = useState(false);

  const handleSendProofreadDraft = async (overrideCc?: boolean) => {
    if (!currentProject || !targetID) return;
    const effectiveCc = overrideCc !== undefined ? overrideCc : ccMyself;
    setSendingProofreadDraft(true);
    const hideLoading = message.loading(
      formatMessage({ id: 'imageTranslator.sendingProofreadDraft' }),
      0,
    );
    try {
      const res = await api.project.sendProofreadDraft({
        projectID: currentProject.id,
        targetID,
        ccMyself: effectiveCc,
      });
      hideLoading();
      message.success(
        res.data.message ||
          formatMessage({ id: 'imageTranslator.sendProofreadDraftSuccess' }),
      );
    } catch (err: unknown) {
      hideLoading();
      if (err && typeof err === 'object') {
        if ('default' in err && typeof err.default === 'function') {
          err.default();
          return;
        }
        if ('message' in err && typeof err.message === 'string') {
          message.error(err.message);
          return;
        }
      }
      message.error(formatMessage({ id: 'site.networkError' }));
    } finally {
      setSendingProofreadDraft(false);
    }
  };

  const confirmSendProofreadDraft = () => {
    let currentCc = ccMyself;
    Modal.confirm({
      title: formatMessage({ id: 'imageTranslator.sendProofreadDraftConfirmTitle' }),
      content: (
        <div>
          <p style={{ marginBottom: 12 }}>
            {formatMessage({ id: 'imageTranslator.sendProofreadDraftConfirmContent' })}
          </p>
          <Checkbox
            defaultChecked={currentCc}
            onChange={(e) => {
              currentCc = e.target.checked;
              setCcMyself(e.target.checked);
              localStorage.setItem('proofread_draft_cc_myself', String(e.target.checked));
            }}
          >
            {formatMessage({ id: 'imageTranslator.ccMyself' })}
          </Checkbox>
        </div>
      ),
      okText: formatMessage({ id: 'site.confirm' }),
      cancelText: formatMessage({ id: 'site.cancel' }),
      onOk: () => handleSendProofreadDraft(currentCc),
    });
  };


  useProjectHeartbeat(file?.projectId || currentProject?.id, {
    action: 'translation',
  });

  useTitle({ prefix: file?.name }, [file?.name]); // 设置标题

  useImageTranslatorHotkeys(
    file,
    sources,
    focusedSourceID,
    autoFocusInput,
    confirmSendProofreadDraft,
  );
  // 翻译器尺寸
  const [imageTranslatorSize, setImageTranslatorSize] = useState({
    width: 0,
    height: 0,
  });
  const windowSize = useWindowSize();

  useEffect(() => {
    setImageTranslatorSize({
      width: windowSize.width - (isMobile ? 0 : sourceListWidth),
      height: windowSize.height - (isMobile ? sourceListHeightMobile : 0),
    });
  }, [
    windowSize.width,
    windowSize.height,
    isMobile,
    sourceListWidth,
    sourceListHeightMobile,
  ]);

  const handleSourceListHeightChange = (newHeight: number) => {
    const clampedHeight = Math.min(
      Math.max(newHeight, sourceListHeightMobileMin),
      sourceListHeightMobileMax,
    );
    setSourceListHeightMobile(clampedHeight);
  };

  // 获取图片信息
  useEffect(() => {
    dispatch(fetchSourcesSaga({ fileID, targetID }));
    setFile(undefined);
    const [cancelToken, cancel] = getCancelToken();
    api.file
      .getFile({
        fileID,
        params: {
          target: targetID,
        },
        configs: { cancelToken },
      })
      .then((result) => {
        const file = toLowerCamelCase(result.data);
        setFile(file);
        dispatch(setCurrentProjectSaga({ id: file.projectId }));
      })
      .catch((error) => {
        error.default();
      });
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileID, targetID]);

  return (
    <div
      css={css`
        position: relative;
        width: 100%;
        height: 100%;
        .ImageTranslator__ImageViewer {
          z-index: 1;
          ${isMobile &&
          css`
            position: absolute;
            bottom: ${sourceListHeightMobile}px;
            left: 0;
          `};
        }
        .ImageTranslator__ImageSourceViewer {
          position: absolute;
          z-index: 10;
          box-shadow: ${style.boxShadowBase};
          overflow: hidden;
          ${isMobile
            ? css`
                bottom: 0;
                left: 0;
                height: ${sourceListHeightMobile}px;
                width: 100%;
                border-radius: ${style.borderRadiusBase}
                  ${style.borderRadiusBase} 0 0;
              `
            : css`
                top: 0;
                right: 0;
                height: 100%;
                width: ${sourceListWidth}px;
                border-radius: ${style.borderRadiusBase} 0 0
                  ${style.borderRadiusBase};
              `};
        }
      `}
    >
      <Global
        styles={css`
          html,
          body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: ${style.translatorColorBackground};
          }
          #root {
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
        `}
      />
      {file && (
        <ImageViewer
          className="ImageTranslator__ImageViewer"
          projectId={file.projectId}
          file={file}
          targetID={targetID}
          labels={sources}
          darkness={imageDarkness}
          width={imageTranslatorSize.width}
          height={imageTranslatorSize.height}
          loading={!currentProject || sourcesLoading}
          readOnly={projectReadOnly}
          onSettingButtonClick={() => {
            setSettingModalVisible(true);
          }}
        />
      )}
      <ImageSourceViewer
        className="ImageTranslator__ImageSourceViewer"
        file={file}
        sources={sources}
        targetID={targetID}
        loading={!currentProject || sourcesLoading}
        readOnly={projectReadOnly}
        onHeightChange={isMobile ? handleSourceListHeightChange : undefined}
      />
      <Modal
        width={700}
        title={formatMessage({ id: 'imageTranslator.settingTitle' })}
        onCancel={() => setSettingModalVisible(false)}
        open={settingModalVisible}
        footer={null}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            color: ${style.textColor};
          `}
        >
          <span>
            {themeMode === 'dark'
              ? formatMessage({ id: 'site.lightMode' })
              : formatMessage({ id: 'site.darkMode' })}
          </span>
          <Switch
            checked={themeMode === 'dark'}
            onChange={(checked) => {
              const newTheme = checked ? 'dark' : 'light';
              dispatch(setThemeMode(newTheme));
              localStorage.setItem('themeMode', newTheme);
            }}
          />
        </div>
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            color: ${style.textColor};
          `}
        >
          <span>{formatMessage({ id: 'imageTranslator.autoFocusInput' })}</span>
          <Switch
            checked={autoFocusInput}
            onChange={(checked) => {
              dispatch(setImageTranslatorAutoFocusInput(checked));
              imageTranslatorSettingsStorage.save({
                autoFocusInput: checked,
                imageDarkness,
              });
            }}
          />
        </div>
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            color: ${style.textColor};
          `}
        >
          <span>{formatMessage({ id: 'imageTranslator.imageDarkness' })}</span>
          <Slider
            min={0}
            max={99}
            value={imageDarkness}
            onChange={(value) => {
              const darkness = typeof value === 'number' ? value : value[0];
              dispatch(setImageTranslatorImageDarkness(darkness));
              imageTranslatorSettingsStorage.save({
                autoFocusInput,
                imageDarkness: darkness,
              });
            }}
            tooltip={{ formatter: (value) => `${value ?? 0}%` }}
            css={css`
              flex: 1;
              min-width: 0;
            `}
          />
        </div>
        <Divider />
        <div
          css={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            gap: 16px;
            flex-wrap: wrap;
          `}
        >
          <div
            css={css`
              display: flex;
              flex-direction: column;
              gap: 4px;
            `}
          >
            <span
              css={css`
                font-weight: 500;
                color: ${style.textColor};
              `}
            >
              {formatMessage({ id: 'imageTranslator.sendProofreadDraft' })}
            </span>
            <span
              css={css`
                font-size: 12px;
                color: ${style.textColorSecondary};
              `}
            >
              {formatMessage({ id: 'imageTranslator.sendProofreadDraftTip' })}
            </span>
          </div>
          <div
            css={css`
              display: flex;
              align-items: center;
              gap: 12px;
            `}
          >
            <Checkbox
              checked={ccMyself}
              onChange={(e) => {
                setCcMyself(e.target.checked);
                localStorage.setItem(
                  'proofread_draft_cc_myself',
                  String(e.target.checked),
                );
              }}
            >
              {formatMessage({ id: 'imageTranslator.ccMyself' })}
            </Checkbox>
            <Button
              type="primary"
              loading={sendingProofreadDraft}
              onClick={() => handleSendProofreadDraft()}
            >
              {formatMessage({ id: 'imageTranslator.sendProofreadDraft' })}
            </Button>
          </div>
        </div>
        {isMobile ? (
          formatMessage({ id: 'imageTranslator.mouseHotkeySettingUnavailable' })
        ) : (
          <>
            <ImageTranslatorSettingMouse />
            <ImageTranslatorSettingHotKey />
            <Divider />
            <ImageTranslatorSettingSymbol />
          </>
        )}
      </Modal>
    </div>
  );
};

function useImageTranslatorHotkeys(
  file: GetFileReturn | undefined,
  sources: Source[],
  focusedSourceID: string | null,
  autoFocusInput: boolean,
  onSendProofreadDraft?: () => void,
) {
  const dispatch = useDispatch();
  const focusNextSource = () => {
    if (sources.length === 0) {
      return;
    }
    let nextFocusedSourceIndex = 0;
    if (focusedSourceID) {
      const focusedSourceIndex = sources.findIndex(
        (source) => source.id === focusedSourceID,
      );
      if (focusedSourceIndex + 1 >= sources.length) {
        nextFocusedSourceIndex = 0;
      } else {
        nextFocusedSourceIndex = focusedSourceIndex + 1;
      }
    }
    const nextFocusedSourceID = sources[nextFocusedSourceIndex].id;
    dispatch(
      focusSource({
        id: nextFocusedSourceID,
        effects: [
          ...(autoFocusInput ? ['focusInput'] : []),
          'focusLabel',
          'scrollIntoView',
        ] as FocusEffect[],
        noises: [
          ...(autoFocusInput ? ['focusInput'] : []),
          'focusLabel',
        ] as FocusEffect[],
      }),
    );
  };
  const focusPrevSource = () => {
    if (sources.length === 0) {
      return;
    }
    let prevFocusedSourceIndex = sources.length - 1;
    if (focusedSourceID) {
      const focusedSourceIndex = sources.findIndex(
        (source) => source.id === focusedSourceID,
      );
      if (focusedSourceIndex - 1 < 0) {
        prevFocusedSourceIndex = sources.length - 1;
      } else {
        prevFocusedSourceIndex = focusedSourceIndex - 1;
      }
    }
    const prevFocusedSourceID = sources[prevFocusedSourceIndex].id;
    dispatch(
      focusSource({
        id: prevFocusedSourceID,
        effects: [
          ...(autoFocusInput ? ['focusInput'] : []),
          'focusLabel',
          'scrollIntoView',
        ] as FocusEffect[],
        noises: [
          ...(autoFocusInput ? ['focusInput'] : []),
          'focusLabel',
        ] as FocusEffect[],
      }),
    );
  };

  // 快捷键 - 下一个输入框
  const focusNextSourceHotKeyOptions = useSelector(
    (state: AppState) => state.hotKey.focusNextSource,
  );
  useHotKey(
    {
      disabled: !Boolean(focusNextSourceHotKeyOptions[0]),
      ...focusNextSourceHotKeyOptions[0],
    },
    focusNextSource,
    [focusedSourceID, sources.length, autoFocusInput],
  );
  useHotKey(
    {
      disabled: !Boolean(focusNextSourceHotKeyOptions[1]),
      ...focusNextSourceHotKeyOptions[1],
    },
    focusNextSource,
    [focusedSourceID, sources.length, autoFocusInput],
  );

  // 快捷键 - 上一个输入框
  const focusPrevSourceHotKeyOptions = useSelector(
    (state: AppState) => state.hotKey.focusPrevSource,
  );
  useHotKey(
    {
      disabled: !Boolean(focusPrevSourceHotKeyOptions[0]),
      ...focusPrevSourceHotKeyOptions[0],
    },
    focusPrevSource,
    [focusedSourceID, sources.length, autoFocusInput],
  );
  useHotKey(
    {
      disabled: !Boolean(focusPrevSourceHotKeyOptions[1]),
      ...focusPrevSourceHotKeyOptions[1],
    },
    focusPrevSource,
    [focusedSourceID, sources.length, autoFocusInput],
  );
  // 快捷键 - 向翻译寄送校对稿
  const mode = useSelector((state: AppState) => state.imageTranslator.mode);
  const isProofreadOrGodMode = mode === 'proofreader' || mode === 'god';
  const sendProofreadDraftHotKeyOptions = useSelector(
    (state: AppState) => state.hotKey.sendProofreadDraft,
  );
  useHotKey(
    {
      disabled:
        !isProofreadOrGodMode ||
        !onSendProofreadDraft ||
        !Boolean(sendProofreadDraftHotKeyOptions?.[0]),
      ...sendProofreadDraftHotKeyOptions?.[0],
    },
    () => onSendProofreadDraft?.(),
    [isProofreadOrGodMode, onSendProofreadDraft],
  );
  useHotKey(
    {
      disabled:
        !isProofreadOrGodMode ||
        !onSendProofreadDraft ||
        !Boolean(sendProofreadDraftHotKeyOptions?.[1]),
      ...sendProofreadDraftHotKeyOptions?.[1],
    },
    () => onSendProofreadDraft?.(),
    [isProofreadOrGodMode, onSendProofreadDraft],
  );


  // 快捷键 - 当 ImageViewer 未加载完成是，忽略所有快捷键
  useHotKey(
    {
      disabled: Boolean(file?.id),
      ignoreKeyboardElement: false,
    },
    () => {},
    [file?.id],
  );
}

function useWindowSize() {
  const osName = useSelector((state: AppState) => state.site.osName);
  const isIOS = osName === 'ios';

  // 页面尺寸
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowSize({ width, height });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    const setTimeoutHandleResize = () => {
      setTimeout(handleResize, 250);
    };
    if (isIOS) {
      window.addEventListener('focusin', setTimeoutHandleResize);
      window.addEventListener('focusout', setTimeoutHandleResize);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (isIOS) {
        window.removeEventListener('focusin', setTimeoutHandleResize);
        window.removeEventListener('focusout', setTimeoutHandleResize);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return windowSize;
}
export default ImageTranslator;
