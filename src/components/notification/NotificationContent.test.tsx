import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { NotificationContent } from './NotificationContent';
import { NoticeNode } from '@/apis/notification';

function render(nodes: NoticeNode[]) {
  return renderToStaticMarkup(
    <IntlProvider
      locale="en"
      messages={{ 'notification.unavailableProject': 'Unavailable' }}
    >
      <MemoryRouter>
        <NotificationContent nodes={nodes} />
      </MemoryRouter>
    </IntlProvider>,
  );
}

test('notification text is escaped, not interpreted as markup', () => {
  const html = render([{ type: 'text', text: '<script>alert(1)</script>' }]);
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
});
test('unsafe URL nodes cannot execute browser protocols', () => {
  const html = render([
    {
      type: 'url',
      url: 'javascript:alert(1)',
      children: [{ type: 'text', text: 'link' }],
    },
  ]);
  expect(html).not.toContain('href');
  expect(html).toContain('link');
});
test('safe links are isolated and unavailable cards reveal no metadata', () => {
  const html = render([
    {
      type: 'url',
      url: 'https://example.com',
      children: [{ type: 'text', text: 'site' }],
    },
    { type: 'unavailable', name: 'Secret project' },
  ]);
  expect(html).toContain('noopener noreferrer');
  expect(html).toContain('Unavailable');
  expect(html).not.toContain('Secret project');
});
test('formatting and project cards are rendered using React nodes', () => {
  const html = render([
    { type: 'b', children: [{ type: 'text', text: 'bold' }] },
    { type: 'project', project_id: 'abc', name: 'Project' },
  ]);
  expect(html).toContain('<strong>bold</strong>');
  expect(html).toContain('/dashboard/projects/abc');
});
