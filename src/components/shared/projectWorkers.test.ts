import style from '@/style';
import {
  getProjectWorkerIconColor,
  parseProjectWorkerInput,
  PROJECT_WORKER_ACTIVE_COLOR,
} from './projectWorkers';

describe('project worker helpers', () => {
  test('uses gray for empty roles and green for populated roles', () => {
    expect(getProjectWorkerIconColor({}, '翻译')).toBe(
      style.textColorSecondaryLighter,
    );
    expect(getProjectWorkerIconColor({ 翻译: ['Alice'] }, '翻译')).toBe(
      PROJECT_WORKER_ACTIVE_COLOR,
    );
    expect(getProjectWorkerIconColor({ 翻译: [] }, '翻译')).toBe(
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
