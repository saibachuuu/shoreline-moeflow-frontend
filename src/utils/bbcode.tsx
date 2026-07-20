import React, { CSSProperties, ReactNode } from 'react';

type BBCodeTag = 'b' | 'i' | 'u' | 's' | 'url' | 'color' | 'size' | 'img';

interface Frame {
  tag: BBCodeTag;
  rawOpenTag: string;
  value: string;
  attributes: Record<string, string>;
  children: ReactNode[];
}

const supportedTags = new Set<BBCodeTag>([
  'b',
  'i',
  'u',
  's',
  'url',
  'color',
  'size',
  'img',
]);

const tagPattern = /\[\/?[a-z]+[^\]]*\]/gi;
const openingTagPattern = /^\[([a-z]+)([^\]]*)\]$/i;
const closingTagPattern = /^\[\/([a-z]+)\]$/i;
const attributePattern = /([a-z]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi;

function getTagOptions(rawOptions: string): {
  value: string;
  attributes: Record<string, string>;
} {
  const options = rawOptions.trim();
  if (options.startsWith('=')) {
    return { value: options.slice(1).trim(), attributes: {} };
  }

  const attributes: Record<string, string> = {};
  for (const match of options.matchAll(attributePattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return { value: '', attributes };
}

function getSafeUrl(value: string, allowMailto = false): string | undefined {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol === 'https:' ||
      url.protocol === 'http:' ||
      (allowMailto && url.protocol === 'mailto:')
    ) {
      return url.toString();
    }
  } catch {
    // Invalid URLs are rendered as plain text instead of becoming links or images.
  }
  return undefined;
}

/** Returns a safe remote image URL, or undefined for an unsupported URL. */
export function getSafeImageUrl(value: string): string | undefined {
  return getSafeUrl(value);
}

function getDimension(value: string | undefined): number | undefined {
  if (!value || !/^\d{1,4}$/.test(value)) return undefined;
  const dimension = Number(value);
  return dimension > 0 && dimension <= 2000 ? dimension : undefined;
}

function getText(nodes: ReactNode[]): string {
  return nodes
    .map((node) => {
      if (typeof node === 'string' || typeof node === 'number')
        return String(node);
      if (React.isValidElement<{ children?: ReactNode }>(node)) {
        return getText(React.Children.toArray(node.props.children));
      }
      return '';
    })
    .join('');
}

function withKey(node: ReactNode, key: number): ReactNode {
  return <React.Fragment key={key}>{node}</React.Fragment>;
}

function renderFrame(frame: Frame, closeTag: string, key: number): ReactNode {
  const { attributes, children, tag, value } = frame;
  const plainText = getText(children).trim();

  switch (tag) {
    case 'b':
      return <strong key={key}>{children}</strong>;
    case 'i':
      return <em key={key}>{children}</em>;
    case 'u':
      return <u key={key}>{children}</u>;
    case 's':
      return <s key={key}>{children}</s>;
    case 'url': {
      const href = getSafeUrl(value || plainText, true);
      return href ? (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <React.Fragment key={key}>
          {frame.rawOpenTag}
          {children}
          {closeTag}
        </React.Fragment>
      );
    }
    case 'color': {
      const color = value || attributes.value;
      return /^#[0-9a-f]{3,8}$/i.test(color) || /^[a-z]{3,20}$/i.test(color) ? (
        <span key={key} style={{ color }}>
          {children}
        </span>
      ) : (
        <React.Fragment key={key}>
          {frame.rawOpenTag}
          {children}
          {closeTag}
        </React.Fragment>
      );
    }
    case 'size': {
      const size = Number(value || attributes.value);
      return Number.isFinite(size) && size >= 10 && size <= 72 ? (
        <span key={key} style={{ fontSize: `${size}px` }}>
          {children}
        </span>
      ) : (
        <React.Fragment key={key}>
          {frame.rawOpenTag}
          {children}
          {closeTag}
        </React.Fragment>
      );
    }
    case 'img': {
      const src = getSafeUrl(value || attributes.src || plainText);
      if (!src) {
        return (
          <React.Fragment key={key}>
            {frame.rawOpenTag}
            {children}
            {closeTag}
          </React.Fragment>
        );
      }

      const style: CSSProperties = {};
      if (attributes.align === 'center') {
        style.display = 'block';
        style.margin = '12px auto';
      } else if (attributes.align === 'left' || attributes.align === 'right') {
        style.float = attributes.align;
        style.margin =
          attributes.align === 'left' ? '0 12px 8px 0' : '0 0 8px 12px';
      }

      return (
        <img
          key={key}
          src={src}
          alt={attributes.alt || ''}
          title={attributes.title}
          width={getDimension(attributes.width)}
          height={getDimension(attributes.height)}
          style={style}
          loading="lazy"
        />
      );
    }
  }
}

/**
 * Render a deliberately small, safe BBCode subset. HTML is always rendered as
 * text, so a site welcome message cannot execute scripts or inject markup.
 */
export function renderBBCode(value: string): ReactNode[] {
  const root: Frame = {
    tag: 'b',
    rawOpenTag: '',
    value: '',
    attributes: {},
    children: [],
  };
  const stack = [root];
  let lastIndex = 0;
  let key = 0;

  const append = (node: ReactNode) => {
    stack[stack.length - 1].children.push(withKey(node, key++));
  };

  for (const match of value.matchAll(tagPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) append(value.slice(lastIndex, index));
    lastIndex = index + token.length;

    const closing = token.match(closingTagPattern);
    if (closing) {
      const tag = closing[1].toLowerCase() as BBCodeTag;
      if (stack.length > 1 && stack[stack.length - 1].tag === tag) {
        const frame = stack.pop()!;
        append(renderFrame(frame, token, key++));
      } else {
        append(token);
      }
      continue;
    }

    const opening = token.match(openingTagPattern);
    if (!opening) {
      append(token);
      continue;
    }
    const tag = opening[1].toLowerCase() as BBCodeTag;
    if (!supportedTags.has(tag)) {
      append(token);
      continue;
    }
    const options = getTagOptions(opening[2]);
    stack.push({
      tag,
      rawOpenTag: token,
      value: options.value,
      attributes: options.attributes,
      children: [],
    });
  }

  if (lastIndex < value.length) append(value.slice(lastIndex));
  while (stack.length > 1) {
    const frame = stack.pop()!;
    append(
      <>
        {frame.rawOpenTag}
        {frame.children}
      </>,
    );
  }
  return root.children;
}
