import React from 'react';
import { Link } from 'react-router-dom';
import { NoticeNode } from '@/apis/notification';
import { useIntl } from 'react-intl';

export function NotificationContent({ nodes }: { nodes: NoticeNode[] }) {
  const { formatMessage } = useIntl();
  const render = (node: NoticeNode, index: number): React.ReactNode => {
    const children = node.children?.map(render);
    switch (node.type) {
      case 'text':
        return <React.Fragment key={index}>{node.text}</React.Fragment>;
      case 'b':
        return <strong key={index}>{children}</strong>;
      case 'i':
        return <em key={index}>{children}</em>;
      case 'u':
        return <u key={index}>{children}</u>;
      case 's':
        return <s key={index}>{children}</s>;
      case 'quote':
        return <blockquote key={index}>{children}</blockquote>;
      case 'list':
        return <ul key={index}>{children}</ul>;
      case 'li':
        return <li key={index}>{children}</li>;
      case 'url': {
        let safe = false;
        try {
          const url = new URL(node.url || '');
          safe =
            ['https:', 'http:'].includes(url.protocol) &&
            !url.username &&
            !url.password;
        } catch {
          /* fail closed */
        }
        return safe ? (
          <a
            key={index}
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ) : (
          <span key={index}>{children}</span>
        );
      }
      case 'project':
        return (
          <div
            key={index}
            style={{
              border: '1px solid currentColor',
              borderRadius: 6,
              padding: 12,
              margin: '8px 0',
            }}
          >
            <Link to={`/dashboard/projects/${node.project_id}`}>
              {node.name}
            </Link>
          </div>
        );
      case 'unavailable':
        return (
          <span key={index}>
            {formatMessage({ id: 'notification.unavailableProject' })}
          </span>
        );
      default:
        return <span key={index}>{node.text}</span>;
    }
  };
  return (
    <div
      style={{
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        maxWidth: '100%',
      }}
    >
      {nodes.map(render)}
    </div>
  );
}
