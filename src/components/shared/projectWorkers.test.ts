import style from '@/style';
import {
  getProjectWorkerIconColor,
  PROJECT_WORKER_ACTIVE_COLOR,
  PROJECT_WORKER_INVITED_COLOR,
} from './projectWorkers';

describe('project member display helpers', () => {
  test('uses active member tags for visible worker status', () => {
    expect(getProjectWorkerIconColor([], 'translator')).toBe(style.textColorSecondaryLighter);
    expect(getProjectWorkerIconColor([{ tags: ['translator'], status: 'active' }], 'translator')).toBe(PROJECT_WORKER_ACTIVE_COLOR);
    expect(getProjectWorkerIconColor([{ tags: ['translator'], status: 'removed' }], 'translator')).toBe(style.textColorSecondaryLighter);
  });

  test('marks an invited-only role with the invited (orange) color', () => {
    expect(getProjectWorkerIconColor([{ tags: ['translator'], status: 'invited' }], 'translator')).toBe(PROJECT_WORKER_INVITED_COLOR);
  });

  test('prefers active over invited members for the same role', () => {
    const members = [
      { tags: ['translator'], status: 'invited' },
      { tags: ['translator'], status: 'active' },
    ];
    expect(getProjectWorkerIconColor(members, 'translator')).toBe(PROJECT_WORKER_ACTIVE_COLOR);
  });

  test('ignores removed members until someone is active or invited', () => {
    expect(getProjectWorkerIconColor([{ tags: ['translator'], status: 'removed' }], 'translator')).toBe(style.textColorSecondaryLighter);
    expect(getProjectWorkerIconColor([{ tags: ['translator'], status: 'removed' }, { tags: ['proofreader'], status: 'invited' }], 'translator')).toBe(style.textColorSecondaryLighter);
    expect(getProjectWorkerIconColor([{ tags: ['proofreader'], status: 'invited' }], 'translator')).toBe(style.textColorSecondaryLighter);
  });
});