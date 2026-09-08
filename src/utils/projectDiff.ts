import { APIProjectMemberSummary } from '@/apis/project';
import { Project } from '@/interfaces';

/**
 * Serialize member summary into a deterministic string to detect changes in staff.
 */
export const serializeMemberSummary = (
  summary?: Array<
    | APIProjectMemberSummary
    | {
        id?: string;
        memberId?: string;
        displayName?: string;
        tags?: string[];
        status?: string;
      }
  >,
): string => {
  if (!summary || summary.length === 0) return '';
  return summary
    .map((m) => {
      const id = m.id || m.memberId || '';
      const name = m.displayName || '';
      const tags = (m.tags || []).slice().sort().join(',');
      const status = m.status || '';
      return `${id}:${name}:${tags}:${status}`;
    })
    .sort()
    .join('|');
};

/**
 * Compare two member summary lists.
 */
export const isMemberSummaryEqual = (
  a?: Array<APIProjectMemberSummary | any>,
  b?: Array<APIProjectMemberSummary | any>,
): boolean => {
  return serializeMemberSummary(a) === serializeMemberSummary(b);
};

/**
 * Check if a single project's visible attributes have changed.
 */
export const isProjectModified = (oldP: Project, newP: Project): boolean => {
  if (oldP.name !== newP.name) return true;
  if (oldP.status !== newP.status) return true;
  if (
    oldP.sourceCount !== newP.sourceCount ||
    oldP.targetCount !== newP.targetCount ||
    oldP.translatedSourceCount !== newP.translatedSourceCount ||
    oldP.checkedSourceCount !== newP.checkedSourceCount
  ) {
    return true;
  }
  if (!isMemberSummaryEqual(oldP.memberSummary, newP.memberSummary)) {
    return true;
  }

  // Active presence (working state) comparison
  const oldPres = oldP.activePresence;
  const newPres = newP.activePresence;
  const oldPresCount = oldPres ? oldPres.userCount : 0;
  const newPresCount = newPres ? newPres.userCount : 0;
  if (oldPresCount !== newPresCount) return true;
  if (oldPresCount > 0) {
    const oldUsers = (oldPres?.users || [])
      .map((u) => `${u.id}:${u.name}`)
      .sort()
      .join(',');
    const newUsers = (newPres?.users || [])
      .map((u) => `${u.id}:${u.name}`)
      .sort()
      .join(',');
    if (oldUsers !== newUsers) return true;
  }

  return false;
};

export interface ProjectChangesResult {
  changeCount: number;
  addedIds: string[];
  removedIds: string[];
  modifiedIds: string[];
  orderChanged: boolean;
}

/**
 * Calculate the number of changes between old and new project lists.
 */
export const calculateProjectChanges = (
  oldList: Project[],
  newList: Project[],
): ProjectChangesResult => {
  if (!oldList || oldList.length === 0) {
    return {
      changeCount: 0,
      addedIds: [],
      removedIds: [],
      modifiedIds: [],
      orderChanged: false,
    };
  }

  const oldMap = new Map<string, Project>();
  for (const p of oldList) {
    oldMap.set(p.id, p);
  }

  const newMap = new Map<string, Project>();
  for (const p of newList) {
    newMap.set(p.id, p);
  }

  const addedIds: string[] = [];
  const modifiedIds: string[] = [];
  const removedIds: string[] = [];

  for (const [id, newProject] of newMap.entries()) {
    const oldProject = oldMap.get(id);
    if (!oldProject) {
      addedIds.push(id);
    } else if (isProjectModified(oldProject, newProject)) {
      modifiedIds.push(id);
    }
  }

  for (const [id] of oldMap.entries()) {
    if (!newMap.has(id)) {
      removedIds.push(id);
    }
  }

  const oldOrder = oldList.map((p) => p.id).join(',');
  const newOrder = newList.map((p) => p.id).join(',');
  const orderChanged = oldOrder !== newOrder;

  let totalChanges = addedIds.length + removedIds.length + modifiedIds.length;
  // If no items were added/removed/modified, but order changed (e.g. pinned/reordered)
  if (totalChanges === 0 && orderChanged) {
    totalChanges = 1;
  }

  return {
    changeCount: totalChanges,
    addedIds,
    removedIds,
    modifiedIds,
    orderChanged,
  };
};
