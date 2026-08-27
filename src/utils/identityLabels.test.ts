import { formatIdentityTagLabel, formatPermissionLabel } from './identityLabels';

const formatMessage = ({ id }: { id: string }) => `localized:${id}`;

describe('identity label localization', () => {
  test('localizes known identity tags and preserves custom names', () => {
    expect(formatIdentityTagLabel(formatMessage, 'creator')).toBe('localized:identity.tag.creator');
    expect(formatIdentityTagLabel(formatMessage, 'reviewer', 'Reviewer')).toBe('Reviewer');
  });

  test('localizes known permissions and preserves unknown codes', () => {
    expect(formatPermissionLabel(formatMessage, 'project:CHANGE')).toBe('localized:identity.permission.project.change');
    expect(formatPermissionLabel(formatMessage, 'project:CUSTOM')).toBe('project:CUSTOM');
  });
});
