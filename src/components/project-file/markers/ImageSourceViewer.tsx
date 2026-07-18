import { css } from '@emotion/core';
import classNames from 'classnames';
import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { FC, File } from '@/interfaces';
import { Source as ISource } from '@/interfaces/source';
import { AppState } from '@/store';
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
}) => {
  const platform = useSelector((state: AppState) => state.site.platform);
  const isMobile = platform === 'mobile';
  const mode = useSelector((state: AppState) => state.imageTranslator.mode);
  const { formatMessage } = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleDragStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!onHeightChange) return;
      e.preventDefault();
      setIsDragging(true);
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      dragStartY.current = clientY;
      dragStartHeight.current = containerRef.current?.offsetHeight || 0;
    },
    [onHeightChange],
  );

  const handleDragMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!isDragging || !onHeightChange) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = dragStartY.current - clientY;
      const newHeight = dragStartHeight.current + deltaY;
      onHeightChange(newHeight);
    },
    [isDragging, onHeightChange],
  );

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={classNames(['ImageSourceViewer', className])}
      css={css`
        background: #fff;
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
          <TranslationSaveFailed sources={sources} targetID={targetID} />
          {sources.length > 0 ? (
            <div className="ImageSourceViewer__List">
              <div
                className="ImageSourceViewer__ModeControl"
                onMouseDown={isMobile ? undefined : handleDragStart}
                onTouchStart={isMobile ? handleDragStart : undefined}
                onMouseMove={isMobile ? undefined : isDragging ? handleDragMove : undefined}
                onTouchMove={isMobile ? (isDragging ? handleDragMove : undefined) : undefined}
                onMouseUp={isMobile ? undefined : handleDragEnd}
                onTouchEnd={isMobile ? handleDragEnd : undefined}
                onMouseLeave={isMobile ? undefined : isDragging ? handleDragEnd : undefined}
                style={{
                  cursor: isMobile ? 'ns-resize' : 'ns-resize',
                  userSelect: isDragging ? 'none' : 'auto',
                }}
              >
                <ImageSourceViewerModeControl />
              </div>
              <div className="ImageSourceViewer__Content">
                {mode === 'source' && (
                  <ImageSourceViewerSource
                    sources={sources}
                    targetID={targetID}
                  />
                )}
                {mode === 'translator' && (
                  <ImageSourceViewerTranslator
                    sources={sources}
                    targetID={targetID}
                  />
                )}
                {mode === 'proofreader' && (
                  <ImageSourceViewerProofreader
                    file={file}
                    sources={sources}
                    targetID={targetID}
                  />
                )}
                {mode === 'god' && (
                  <ImageSourceViewerGod sources={sources} targetID={targetID} />
                )}
              </div>
            </div>
          ) : isMobile ? (
            <div className="ImageSourceViewer__Empty">
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
            </div>
          ) : (
            <div className="ImageSourceViewer__Empty">
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
            </div>
          )}
        </>
      )}
    </div>
  );
};
