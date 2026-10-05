import { css } from '@emotion/core';
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Tooltip } from 'antd';
import { useIntl } from 'react-intl';
import classNames from 'classnames';
import { Button } from './Button';

const ToolbarContext = createContext({
  compact: false,
  armed: null as string | null,
  arm: (() => {}) as (key: string | null) => void,
});

/** Collapse based on actual label widths, including translations and target names. */
export function ResponsiveToolbar({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [armed, arm] = useState<string | null>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      // Measure a non-interactive clone in expanded mode: this avoids threshold
      // guesses and resize oscillation caused by measuring the collapsed labels.
      const clone = node.cloneNode(true) as HTMLDivElement;
      clone.classList.remove('ResponsiveToolbar--compact');
      clone.setAttribute('aria-hidden', 'true');
      Object.assign(clone.style, {
        position: 'fixed',
        left: '-100000px',
        top: '0',
        width: 'max-content',
        visibility: 'hidden',
      });
      node.parentElement?.appendChild(clone);
      const required = clone.scrollWidth;
      clone.remove();
      setCompact(required > node.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(() => {
      measure();
      arm(null);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape')
        return;
      if (
        event.type === 'pointerdown' &&
        ref.current?.contains(event.target as Node)
      )
        return;
      arm(null);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    document.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('scroll', dismiss, true);
    };
  }, []);
  return (
    <ToolbarContext.Provider value={{ compact, armed, arm }}>
      <div
        ref={ref}
        role="toolbar"
        className={classNames('ResponsiveToolbar', className, {
          'ResponsiveToolbar--compact': compact,
        })}
        css={css`
          display: flex;
          flex-wrap: nowrap;
          min-width: 0;
          .Button {
            flex: none;
            white-space: nowrap;
          }
          .Button__Content {
            white-space: nowrap;
          }
          &.ResponsiveToolbar--compact {
            .Button {
              flex: 1 1 0;
              min-width: 0;
              padding: 0;
            }
            .Button__Content {
              min-width: 40px;
              padding: 0 6px;
              justify-content: center;
            }
            .Button__Icon {
              margin-right: 0;
              flex-shrink: 0;
            }
            .ResponsiveToolbar__Label {
              display: none;
            }
          }
        `}
      >
        {children}
      </div>
    </ToolbarContext.Provider>
  );
}

type ToolbarButtonProps = React.ComponentProps<typeof Button> & {
  actionKey: string;
  description: string;
};
export function ToolbarButton({
  actionKey,
  description,
  children,
  onClick,
  tooltipProps,
  ...props
}: ToolbarButtonProps) {
  const { compact, armed, arm } = useContext(ToolbarContext);
  const { formatMessage } = useIntl();
  const disabled = props.disabled || props.loading;
  return (
    <Tooltip
      placement="bottom"
      title={
        <>
          {description}
          <br />
          {formatMessage({ id: 'toolbar.tapAgain' })}
        </>
      }
      trigger={[]}
      visible={compact && !disabled && armed === actionKey}
      overlayStyle={{ pointerEvents: 'none' }}
    >
      <Button
        {...props}
        elem="button"
        aria-label={description}
        tooltipProps={compact ? undefined : tooltipProps}
        onBlur={() => arm(null)}
        onClick={(event) => {
          if (disabled) return;
          if (compact && armed !== actionKey) {
            arm(actionKey);
            return;
          }
          arm(null);
          onClick?.(event);
        }}
      >
        <span className="ResponsiveToolbar__Label">{children}</span>
      </Button>
    </Tooltip>
  );
}
