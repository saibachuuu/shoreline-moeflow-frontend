export const IDENTITY_TAG_MESSAGE_IDS: Record<string, string> = {
  creator: 'identity.tag.creator',
  admin: 'identity.tag.admin',
  member: 'identity.tag.member',
  raw_provider: 'identity.tag.rawProvider',
  scanner: 'identity.tag.scanner',
  cropper: 'identity.tag.cropper',
  cleaner: 'identity.tag.cleaner',
  translator: 'identity.tag.translator',
  proofreader: 'identity.tag.proofreader',
  typesetter: 'identity.tag.typesetter',
};

export const PERMISSION_MESSAGE_IDS: Record<string, string> = {
  'project:ACCESS': 'identity.permission.project.access',
  'project:CHANGE': 'identity.permission.project.change',
  'project:COMPLETE_PROJECT': 'identity.permission.project.completeProject',
  'project:ADD_FILE': 'identity.permission.project.addFile',
  'project:MOVE_FILE': 'identity.permission.project.moveFile',
  'project:RENAME_FILE': 'identity.permission.project.renameFile',
  'project:DELETE_FILE': 'identity.permission.project.deleteFile',
  'project:OUTPUT_TRA': 'identity.permission.project.outputTranslation',
  'project:ADD_LABEL': 'identity.permission.project.addLabel',
  'project:MOVE_LABEL': 'identity.permission.project.moveLabel',
  'project:DELETE_LABEL': 'identity.permission.project.deleteLabel',
  'project:ADD_TRA': 'identity.permission.project.addTranslation',
  'project:DELETE_TRA': 'identity.permission.project.deleteTranslation',
  'project:PROOFREAD_TRA': 'identity.permission.project.proofreadTranslation',
  'project:CHECK_TRA': 'identity.permission.project.checkTranslation',
  'project:ADD_TARGET': 'identity.permission.project.addTarget',
  'project:CHANGE_TARGET': 'identity.permission.project.changeTarget',
  'project:DELETE_TARGET': 'identity.permission.project.deleteTarget',
  'project:CHECK_USER': 'identity.permission.project.checkUser',
  'project:INVITE_USER': 'identity.permission.project.inviteUser',
  'project:CHANGE_USER_REMARK': 'identity.permission.project.changeUserRemark',
  'project:CHANGE_USER_ROLE': 'identity.permission.project.changeUserRole',
  'project:DELETE_USER': 'identity.permission.project.deleteUser',
  'project:MANAGE_MEMBERS': 'identity.permission.project.manageMembers',
  'team:ACCESS': 'identity.permission.team.access',
  'team:DELETE': 'identity.permission.team.delete',
  'team:CHANGE': 'identity.permission.team.change',
  'team:CREATE_ROLE': 'identity.permission.team.createRole',
  'team:DELETE_ROLE': 'identity.permission.team.deleteRole',
  'team:CHECK_USER': 'identity.permission.team.checkUser',
  'team:INVITE_USER': 'identity.permission.team.inviteUser',
  'team:DELETE_USER': 'identity.permission.team.deleteUser',
  'team:CHANGE_USER_ROLE': 'identity.permission.team.changeUserRole',
  'team:CHANGE_USER_REMARK': 'identity.permission.team.changeUserRemark',
  'team:CREATE_TERM_BANK': 'identity.permission.team.createTermBank',
  'team:ACCESS_TERM_BANK': 'identity.permission.team.accessTermBank',
  'team:CHANGE_TERM_BANK': 'identity.permission.team.changeTermBank',
  'team:DELETE_TERM_BANK': 'identity.permission.team.deleteTermBank',
  'team:CREATE_TERM': 'identity.permission.team.createTerm',
  'team:CHANGE_TERM': 'identity.permission.team.changeTerm',
  'team:DELETE_TERM': 'identity.permission.team.deleteTerm',
  'team:CREATE_PROJECT': 'identity.permission.team.createProject',
  'team:CREATE_PROJECT_SET': 'identity.permission.team.createProjectSet',
  'team:CHANGE_PROJECT_SET': 'identity.permission.team.changeProjectSet',
  'team:DELETE_PROJECT_SET': 'identity.permission.team.deleteProjectSet',
  'team:USE_OCR_QUOTA': 'identity.permission.team.useOcrQuota',
  'team:USE_MT_QUOTA': 'identity.permission.team.useMtQuota',
  'team:INSIGHT': 'identity.permission.team.insight',
};

type FormatMessage = (descriptor: { id: string }) => string;

export const formatIdentityTagLabel = (
  formatMessage: FormatMessage,
  code: string,
  fallback?: string,
): string => {
  const messageId = IDENTITY_TAG_MESSAGE_IDS[code];
  return messageId ? formatMessage({ id: messageId }) : fallback || code;
};

export const formatPermissionLabel = (
  formatMessage: FormatMessage,
  code: string,
): string => {
  const messageId = PERMISSION_MESSAGE_IDS[code];
  return messageId ? formatMessage({ id: messageId }) : code;
};
