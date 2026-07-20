import style from '@/style';
import {
  getProjectWorkerIconColor,
  parseProjectWorkerInput,
  PROJECT_WORKER_ACTIVE_COLOR,
} from './projectWorkers';

describe('project worker helpers', () => {
  test('uses gray for empty roles and green for populated roles', () => {
    expect(getProjectWorkerIconColor({}, 'translator')).toBe(
      style.textColorSecondaryLighter,
    );
    expect(getProjectWorkerIconColor({ translator: ['Alice'] }, 'translator')).toBe(
      PROJECT_WORKER_ACTIVE_COLOR,
    );
    expect(getProjectWorkerIconColor({ translator: [] }, 'translator')).toBe(
      style.textColorSecondaryLighter,
    );
  });

  test('parses comma-separated names and discards blank values', () => {
    expect(parseProjectWorkerInput(' Alice, ,Bob ,, Alice ')).toEqual([
      'Alice',
      'Bob',
      'Alice',
    ]);
  });
});
