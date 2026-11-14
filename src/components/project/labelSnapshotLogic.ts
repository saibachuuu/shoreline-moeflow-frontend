import { LabelCapabilities, MergePreview } from '@/apis/labelSnapshot';

export function canDeleteLabels(field: string, hasSourceContent?: boolean) {
  return (
    field === 'source' ||
    (field === 'translation' && hasSourceContent === false)
  );
}

export function hasMergeConflicts(
  preview: MergePreview | undefined,
  versions: Record<string, string>,
  selections: Record<string, string>,
) {
  return !!(
    preview?.candidates.some(
      (candidate) => candidate.versions.length > 1 && !versions[candidate.key],
    ) ||
    preview?.selectionConflicts.some(
      (conflict) => !selections[conflict.sourceId],
    )
  );
}

export function canSubmitSnapshotAction(
  action: 'create' | 'restore' | 'merge' | null,
  caps: LabelCapabilities,
  field: string,
  selected: string,
  preview: MergePreview | undefined,
  unresolved: boolean,
) {
  if (action === 'create') return caps.create;
  if (action === 'restore')
    return selected === 'empty' && field === 'proofread'
      ? caps.clearProofread
      : caps.restore;
  return (
    action === 'merge' && caps.merge && !!preview?.proofreadCount && !unresolved
  );
}
