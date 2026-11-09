import { LabelCapabilities, MergePreview } from '@/apis/labelSnapshot';
import {
  canDeleteLabels,
  canSubmitSnapshotAction,
  hasMergeConflicts,
} from './labelSnapshotLogic';

const caps: LabelCapabilities = {
  create: true,
  restore: true,
  clearProofread: true,
  merge: true,
};
const preview: MergePreview = {
  token: 'token',
  proofreadCount: 1,
  candidates: [
    {
      key: 'source:user',
      sourceId: 'source',
      rank: 1,
      sourceContent: '原文',
      userId: 'user',
      userName: '校对者',
      versions: [{ id: 'one', content: '译文' }],
    },
  ],
  selectionConflicts: [],
};

test('deleting labels requires source clearing or definitely empty source content', () => {
  expect(canDeleteLabels('source', true)).toBe(true);
  expect(canDeleteLabels('translation', false)).toBe(true);
  expect(canDeleteLabels('translation', true)).toBe(false);
  expect(canDeleteLabels('translation', undefined)).toBe(false);
  expect(canDeleteLabels('proofread', false)).toBe(false);
});
test('proofreader may clear proofreading but not whole labels or full snapshots', () => {
  const proofreader = { ...caps, restore: false };
  expect(
    canSubmitSnapshotAction(
      'restore',
      proofreader,
      'proofread',
      'empty',
      undefined,
      false,
    ),
  ).toBe(true);
  expect(
    canSubmitSnapshotAction(
      'restore',
      proofreader,
      'translation',
      'empty',
      undefined,
      false,
    ),
  ).toBe(false);
  expect(
    canSubmitSnapshotAction(
      'restore',
      proofreader,
      'proofread',
      'snapshot',
      undefined,
      false,
    ),
  ).toBe(false);
});
test('merge cannot proceed without a nonempty preview or with unresolved choices', () => {
  expect(canSubmitSnapshotAction('merge', caps, '', '', undefined, false)).toBe(
    false,
  );
  expect(
    canSubmitSnapshotAction(
      'merge',
      caps,
      '',
      '',
      { ...preview, proofreadCount: 0 },
      false,
    ),
  ).toBe(false);
  expect(canSubmitSnapshotAction('merge', caps, '', '', preview, true)).toBe(
    false,
  );
  expect(canSubmitSnapshotAction('merge', caps, '', '', preview, false)).toBe(
    true,
  );
});
test('only genuinely conflicting content needs a version choice', () => {
  expect(hasMergeConflicts(preview, {}, {})).toBe(false);
  const conflicting = {
    ...preview,
    candidates: [
      {
        ...preview.candidates[0],
        versions: [
          ...preview.candidates[0].versions,
          { id: 'two', content: '另一译文' },
        ],
      },
    ],
  };
  expect(hasMergeConflicts(conflicting, {}, {})).toBe(true);
  expect(hasMergeConflicts(conflicting, { 'source:user': 'two' }, {})).toBe(
    false,
  );
});
test('multiple proofreaders require an explicit selected winner', () => {
  const conflicting = {
    ...preview,
    selectionConflicts: [{ sourceId: 'source', users: ['user', 'other'] }],
  };
  expect(hasMergeConflicts(conflicting, {}, {})).toBe(true);
  expect(hasMergeConflicts(conflicting, {}, { source: 'other' })).toBe(false);
});
test('hidden actions and unauthorized actions cannot submit', () => {
  expect(canSubmitSnapshotAction(null, caps, '', '', preview, false)).toBe(
    false,
  );
  expect(
    canSubmitSnapshotAction(
      'create',
      { ...caps, create: false },
      '',
      '',
      undefined,
      false,
    ),
  ).toBe(false);
  expect(
    canSubmitSnapshotAction(
      'merge',
      { ...caps, merge: false },
      '',
      '',
      preview,
      false,
    ),
  ).toBe(false);
});
