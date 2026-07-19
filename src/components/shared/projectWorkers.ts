import style from '@/style';
import type { ProjectWorkerRole, ProjectWorkers } from '@/apis/project';

export const PROJECT_WORKER_ACTIVE_COLOR = '#28a745';
export const PROJECT_WORKER_EMPTY_COLOR = style.textColorSecondaryLighter;

export function hasProjectWorker(
  workers: ProjectWorkers,
  role: ProjectWorkerRole,
): boolean {
  return Boolean(workers[role]?.length);
}

export function getProjectWorkerIconColor(
  workers: ProjectWorkers,
  role: ProjectWorkerRole,
): string {
  return hasProjectWorker(workers, role)
    ? PROJECT_WORKER_ACTIVE_COLOR
    : PROJECT_WORKER_EMPTY_COLOR;
}

export function parseProjectWorkerInput(value: string): string[] {
  return value
    .split(',')
    .map((member) => member.trim())
    .filter((member) => member.length > 0);
}
