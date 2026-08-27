import { css } from '@emotion/core';
import classNames from 'classnames';
import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { FC, File } from '@/interfaces';
import { Source as ISource } from '@/interfaces/source';
import { AppState } from '@/store';
import style from '@/style';
import { TranslationSaveFailed } from './TranslationSaveFailed';
import { ImageSourceViewerSource } from './source';
import { ImageSourceViewerTranslator } from './translate';
import { ImageSourceViewerProofreader } from './proofread';
import { ImageSourceViewerGod } from './overview';
import { useIntl } from 'react-intl';
import { ImageSourceViewerModeControl } from '@/components/project-file/markers/ImageSourceViewerModeControl';

/** 原文列表的属性接口 */
interface ImageSourceViewerProps {
  file?: File;
  sources: ISource[];
  targetID: string;
  loading: boolean;
  className?: string;
  onHeightChange?: (height: number) => void;
  readOnly?: boolean;
}
/**
 * 原文列表
 */
export const ImageSourceViewer: FC<ImageSourceViewerProps> = ({
  file,
  sources,
  targetID,
  loading,
  className,
  onHeightChange,
  readOnly = false,
}) => {
  const platform = useSelector((state: AppState) => state.site.platform);
  const isMobile = platform === 'mobile';
  const mode = useSelector((state: AppState) => state.imageTranslator.mode);
  const { formatMessage } = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onHeightChange) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartHeight.current = containerRef.current?.offsetHeight || 0;
    },
    [onHeightChange],
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !onHeightChange) return;
      const deltaY = dragStartY.current - e.clientY;
      const newHeight = dragStartHeight.current + deltaY;
      onHeightChange(newHeight);
    },
    [onHeightChange],
  );

  const handleDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div
      ref={containerRef}
      className={classNames(['ImageSourceViewer', className])}
      css={css`
        background: ${style.backgroundColorLight};
        display: flex;
        flex-direction: column;
        overflow: hidden;
        .ImageSourceViewer__List {
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ImageSourceViewer__ModeControl {
          flex: none;
        }
        .ImageSourceViewer__Content {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }
        .ImageSourceViewer__Empty {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
      `}
    >
      {/* TODO: 将这里的 Spin 改成占位符 */}
      {!loading && (
        <>
          {!readOnly && <TranslationSaveFailed sources={sources} targetID={targetID} />}
          {sources.length > 0 ? (
            <div className="ImageSourceViewer__List">
              <div
                className="ImageSourceViewer__ModeControl"
                onPointerDown={onHeightChange ? handleDragStart : undefined}
                onPointerMove={onHeightChange ? handleDragMove : undefined}
                onPointerUp={onHeightChange ? handleDragEnd : undefined}
                onPointerCancel={onHeightChange ? handleDragEnd : undefined}
                style={{
                  cursor: onHeightChange ? 'ns-resize' : undefined,
                  touchAction: onHeightChange ? 'none' : undefined,
                  userSelect: isDragging ? 'none' : 'auto',
                }}
              >
                <ImageSourceViewerModeControl readOnly={readOnly} />
              </div>
              <div className="ImageSourceViewer__Content">
                {mode === 'source' && (
                  <ImageSourceViewerSource
                    sources={sources}
                    targetID={targetID}
                    readOnly={readOnly}
                  />
                )}
                {mode === 'translator' && (
                  <ImageSourceViewerTranslator
                    sources={sources}
                    targetID={targetID}
                    readOnly={readOnly}
                  />
                )}
                {mode === 'proofreader' && (
                  <ImageSourceViewerProofreader
                    file={file}
                    sources={sources}
                    targetID={targetID}
                    readOnly={readOnly}
                  />
                )}
                {mode === 'god' && (
                  <ImageSourceViewerGod
                    sources={sources}
                    targetID={targetID}
                    readOnly={readOnly}
                  />
                )}
              </div>
            </div>
          ) : isMobile ? (
            <div className="ImageSourceViewer__Empty">
              {readOnly ? (
                <div>{formatMessage({ id: 'imageTranslator.sourceViewer.readOnly' })}</div>
              ) : (
                <>
                  <div>
                    {formatMessage({
                      id: 'imageTranslator.sourceViewer.tapToMarkSource',
                    })}
                  </div>
                  <div>
                    {formatMessage({
                      id: 'imageTranslator.sourceViewer.longTapToRemoveMark',
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="ImageSourceViewer__Empty">
              {readOnly ? (
                <div>{formatMessage({ id: 'imageTranslator.sourceViewer.readOnly' })}</div>
              ) : (
                <>
                  <div>
                    {formatMessage({
                      id: 'imageTranslator.sourceViewer.leftClickToMarkSource',
                    })}
                  </div>
                  <div>
                    {formatMessage({
                      id: 'imageTranslator.sourceViewer.rightClickToMarkSource',
                    })}
                  </div>
                  <div>
                    {formatMessage({
                      id: 'imageTranslator.sourceViewer.rightClickMarkToRemove',
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
