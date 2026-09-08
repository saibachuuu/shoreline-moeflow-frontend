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

  test('all project worker roles have valid localization entries in zh-cn and en', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const zhCn = require('@/locales/zh-cn.json');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const en = require('@/locales/en.json');
    const workerRoles = [
      'raw_provider',
      'scanner',
      'cropper',
      'cleaner',
      'translator',
      'proofreader',
      'typesetter',
    ];

    workerRoles.forEach((role) => {
      const key = `project.workerRole.${role}`;
      expect(zhCn[key]).toBeTruthy();
      expect(en[key]).toBeTruthy();
    });
    expect(zhCn['project.workerRole.raw_provider']).toBe('图源');
    expect(en['project.workerRole.raw_provider']).toBe('Raw Provider');
  });
});
