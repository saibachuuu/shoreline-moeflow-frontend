import { request, PaginationParams } from './index';
import { toLowerCamelCase } from '@/utils';

export interface LabelCapabilities {
  create: boolean;
  restore: boolean;
  clearProofread: boolean;
  merge: boolean;
}
export interface LabelState {
  capabilities: LabelCapabilities;
  hasSourceContent: boolean;
  recoveryRequired: boolean;
}
export interface LabelSnapshot {
  id: string;
  name: string;
  created: string;
  actorName: string;
  reason: string;
  counts: { sources: number; translations: number; tips: number };
}
export interface MergeCandidate {
  key: string;
  sourceId: string;
  rank: number;
  sourceContent: string;
  userId: string;
  userName: string;
  versions: { id: string; content: string }[];
}
export interface MergePreview {
  token: string;
  candidates: MergeCandidate[];
  selectionConflicts: { sourceId: string; users: string[] }[];
  proofreadCount: number;
}
const base = (projectId: string) => `/v1/projects/${projectId}`;
const converted = async <T>(url: string, params?: object) => {
  const result = await request({ url, params });
  return { ...result, data: toLowerCamelCase(result.data) as T };
};
export const labelSnapshot = {
  state: (id: string) => converted<LabelState>(`${base(id)}/label-state`),
  list: (id: string, params: PaginationParams) =>
    converted<LabelSnapshot[]>(`${base(id)}/snapshots`, params),
  create: (id: string, name: string) =>
    request({ url: `${base(id)}/snapshots`, method: 'POST', data: { name } }),
  restore: (id: string, snapshotId: string) =>
    request({
      url: `${base(id)}/snapshots/${snapshotId}/restore`,
      method: 'POST',
    }),
  clear: (
    id: string,
    field: string,
    deleteLabels: boolean,
    clearTips: boolean,
  ) =>
    request({
      url: `${base(id)}/label-clear`,
      method: 'POST',
      data: { field, delete_labels: deleteLabels, clear_tips: clearTips },
    }),
  preview: (id: string, targetId: string) =>
    converted<MergePreview>(`${base(id)}/label-merge`, { target_id: targetId }),
  merge: (
    id: string,
    targetId: string,
    preview: MergePreview,
    versions: Record<string, string>,
    selections: Record<string, string>,
  ) =>
    request({
      url: `${base(id)}/label-merge`,
      method: 'POST',
      data: { target_id: targetId, token: preview.token, versions, selections },
    }),
  recover: (id: string) =>
    request({ url: `${base(id)}/label-recover`, method: 'POST' }),
};
