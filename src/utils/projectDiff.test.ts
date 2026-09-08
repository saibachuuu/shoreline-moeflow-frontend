import { PROJECT_STATUS } from '@/constants';
import { Project } from '@/interfaces';
import {
  calculateProjectChanges,
  isMemberSummaryEqual,
  isProjectContentModified,
  isProjectModified,
  serializeMemberSummary,
} from './projectDiff';

const makeMockProject = (partial: Partial<Project> = {}): Project =>
  ({
    id: 'proj-1',
    name: 'Test Project 1',
    status: PROJECT_STATUS.NORMAL,
    sourceCount: 10,
    targetCount: 1,
    translatedSourceCount: 5,
    checkedSourceCount: 3,
    memberSummary: [
      {
        memberId: 'm-1',
        displayName: 'Alice',
        tags: ['translator'],
        status: 'active',
      },
    ],
    activePresence: null,
    team: { id: 'team-1', name: 'Team 1' } as any,
    projectSet: { id: 'ps-1', name: 'PS 1' } as any,
    ...partial,
  }) as Project;

describe('projectDiff utils', () => {
  describe('memberSummary equality', () => {
    it('handles empty / undefined', () => {
      expect(serializeMemberSummary(undefined)).toBe('');
      expect(serializeMemberSummary([])).toBe('');
      expect(isMemberSummaryEqual(undefined, [])).toBe(true);
    });

    it('considers same members in different order as equal', () => {
      const a = [
        {
          memberId: 'm-1',
          displayName: 'Alice',
          tags: ['translator', 'proofreader'],
          status: 'active',
        },
        {
          memberId: 'm-2',
          displayName: 'Bob',
          tags: ['cleaner'],
          status: 'active',
        },
      ];
      const b = [
        {
          memberId: 'm-2',
          displayName: 'Bob',
          tags: ['cleaner'],
          status: 'active',
        },
        {
          memberId: 'm-1',
          displayName: 'Alice',
          tags: ['proofreader', 'translator'],
          status: 'active',
        },
      ];
      expect(isMemberSummaryEqual(a, b)).toBe(true);
    });

    it('detects changes in tags or status', () => {
      const a = [
        {
          memberId: 'm-1',
          displayName: 'Alice',
          tags: ['translator'],
          status: 'active',
        },
      ];
      const b = [
        {
          memberId: 'm-1',
          displayName: 'Alice',
          tags: ['proofreader'],
          status: 'active',
        },
      ];
      expect(isMemberSummaryEqual(a, b)).toBe(false);
    });
  });

  describe('isProjectModified', () => {
    it('returns false for identical project', () => {
      const p1 = makeMockProject();
      const p2 = makeMockProject();
      expect(isProjectModified(p1, p2)).toBe(false);
    });

    it('detects name change', () => {
      const p1 = makeMockProject({ name: 'Old' });
      const p2 = makeMockProject({ name: 'New' });
      expect(isProjectModified(p1, p2)).toBe(true);
    });

    it('detects status change', () => {
      const p1 = makeMockProject({ status: PROJECT_STATUS.NORMAL });
      const p2 = makeMockProject({ status: PROJECT_STATUS.COMPLETED });
      expect(isProjectModified(p1, p2)).toBe(true);
    });

    it('detects progress change', () => {
      const p1 = makeMockProject({ translatedSourceCount: 5 });
      const p2 = makeMockProject({ translatedSourceCount: 6 });
      expect(isProjectModified(p1, p2)).toBe(true);
    });

    it('detects activePresence change', () => {
      const p1 = makeMockProject({ activePresence: null });
      const p2 = makeMockProject({
        activePresence: {
          projectId: 'proj-1',
          userCount: 1,
          users: [{ id: 'u-1', name: 'Alice' }],
        },
      });
      expect(isProjectModified(p1, p2)).toBe(true);
      // 编辑状态不算内容变化
      expect(isProjectContentModified(p1, p2)).toBe(false);
    });

    it('isProjectContentModified ignores presence but detects content', () => {
      const base = makeMockProject({ activePresence: null });
      const presenceOnly = makeMockProject({
        activePresence: {
          projectId: 'proj-1',
          userCount: 1,
          users: [{ id: 'u-1', name: 'Alice' }],
        },
      });
      expect(isProjectContentModified(base, presenceOnly)).toBe(false);
      expect(
        isProjectContentModified(base, makeMockProject({ name: 'New' })),
      ).toBe(true);
    });
  });

  describe('calculateProjectChanges', () => {
    it('returns 0 when oldList is empty', () => {
      const res = calculateProjectChanges([], [makeMockProject()]);
      expect(res.changeCount).toBe(0);
    });

    it('returns 0 when lists are identical', () => {
      const p1 = makeMockProject({ id: '1' });
      const p2 = makeMockProject({ id: '2' });
      const res = calculateProjectChanges([p1, p2], [p1, p2]);
      expect(res.changeCount).toBe(0);
    });

    it('detects added and removed projects', () => {
      const p1 = makeMockProject({ id: '1' });
      const p2 = makeMockProject({ id: '2' });
      const p3 = makeMockProject({ id: '3' });

      // p1 removed, p3 added
      const res = calculateProjectChanges([p1, p2], [p2, p3]);
      expect(res.changeCount).toBe(2);
      expect(res.removedIds).toEqual(['1']);
      expect(res.addedIds).toEqual(['3']);
    });

    it('detects modified projects', () => {
      const p1 = makeMockProject({ id: '1', name: 'Old' });
      const p1New = makeMockProject({ id: '1', name: 'New' });
      const res = calculateProjectChanges([p1], [p1New]);
      expect(res.changeCount).toBe(1);
      expect(res.modifiedIds).toEqual(['1']);
    });

    it('detects order changes when items are identical', () => {
      const p1 = makeMockProject({ id: '1' });
      const p2 = makeMockProject({ id: '2' });
      const res = calculateProjectChanges([p1, p2], [p2, p1]);
      expect(res.changeCount).toBe(1);
      expect(res.orderChanged).toBe(true);
      // 顺序变化需要弹提醒
      expect(res.contentChangeCount).toBe(1);
    });

    it('presence-only change refreshes data but does not notify', () => {
      const p1 = makeMockProject({ activePresence: null });
      const p2 = makeMockProject({
        activePresence: {
          projectId: 'proj-1',
          userCount: 1,
          users: [{ id: 'u-1', name: 'Alice' }],
        },
      });
      const res = calculateProjectChanges([p1], [p2]);
      expect(res.changeCount).toBe(1);
      expect(res.contentChangeCount).toBe(0);
    });

    it('content change notifies', () => {
      const p1 = makeMockProject({ id: '1', name: 'Old' });
      const p2 = makeMockProject({ id: '1', name: 'New' });
      const res = calculateProjectChanges([p1], [p2]);
      expect(res.changeCount).toBe(1);
      expect(res.contentChangeCount).toBe(1);
    });
  });
});
