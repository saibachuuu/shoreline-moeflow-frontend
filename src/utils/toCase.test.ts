import { toLowerCamelCase, toUnderScoreCase } from '@/utils';

describe('toLowerCamelCase', () => {
  it('maps auto_join_team_ids to autoJoinTeamIds (abbr _id rule)', () => {
    const result = toLowerCamelCase({
      auto_join_team_ids: ['67b231b45781d7125d41e311'],
      whitelist_emails: ['a@b.com'],
    });
    expect(result).toEqual({
      autoJoinTeamIds: ['67b231b45781d7125d41e311'],
      whitelistEmails: ['a@b.com'],
    });
  });

  it('keeps whitelist_emails as whitelistEmails', () => {
    expect(toLowerCamelCase({ whitelist_emails: [] })).toEqual({
      whitelistEmails: [],
    });
  });

  it('maps default_display_name to defaultDisplayName', () => {
    expect(toLowerCamelCase({ default_display_name: '我的署名' })).toEqual({
      defaultDisplayName: '我的署名',
    });
  });
});

describe('toUnderScoreCase', () => {
  it('maps autoJoinTeamIDs back to auto_join_team_ids', () => {
    expect(toUnderScoreCase({ autoJoinTeamIDs: [] })).toEqual({
      auto_join_team_ids: [],
    });
  });
});
