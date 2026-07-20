import { renderToStaticMarkup } from 'react-dom/server';
import { getSafeImageUrl, renderBBCode } from './bbcode';

describe('renderBBCode', () => {
  it('renders the supported formatting and link tags', () => {
    const html = renderToStaticMarkup(
      <>{renderBBCode('[b]Bold[/b] [url=https://example.com]Link[/url]')}</>,
    );

    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('href="https://example.com/"');
    expect(html).toContain('target="_blank"');
  });

  it('renders configurable remote images', () => {
    const html = renderToStaticMarkup(
      <>
        {renderBBCode(
          '[img width=320 height=180 alt="Welcome image" align=center]https://example.com/welcome.png[/img]',
        )}
      </>,
    );

    expect(html).toContain('src="https://example.com/welcome.png"');
    expect(html).toContain('width="320"');
    expect(html).toContain('height="180"');
    expect(html).toContain('alt="Welcome image"');
  });

  it('does not turn HTML or unsafe URLs into executable markup', () => {
    const html = renderToStaticMarkup(
      <>
        {renderBBCode(
          '<script>alert(1)</script> [url=javascript:alert(1)]x[/url]',
        )}
      </>,
    );

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href=');
  });

  it('only permits HTTP(S) homepage image URLs', () => {
    expect(getSafeImageUrl('https://example.com/welcome.png')).toBe(
      'https://example.com/welcome.png',
    );
    expect(getSafeImageUrl('javascript:alert(1)')).toBeUndefined();
  });
});
