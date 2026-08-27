import { PROJECT_STATUS, normalizeProjectStatus } from './project';

describe('project identity status', () => {
  test('keeps the three runtime states distinct', () => {
    expect(normalizeProjectStatus(PROJECT_STATUS.NORMAL)).toBe(PROJECT_STATUS.NORMAL);
    expect(normalizeProjectStatus(PROJECT_STATUS.COMPLETED)).toBe(PROJECT_STATUS.COMPLETED);
    expect(normalizeProjectStatus(PROJECT_STATUS.CLEARED)).toBe(PROJECT_STATUS.CLEARED);
  });

  test('uses normal as the default for missing state', () => {
    expect(normalizeProjectStatus(undefined)).toBe(PROJECT_STATUS.NORMAL);
  });
});
