import { PROJECT_STATUS } from '@/constants';

interface TeamProjectSearchParamsInput {
  page: number;
  limit: number;
  status: PROJECT_STATUS;
  searchMode: string;
  searchRole?: string;
  word?: string;
  currentProjectSetID: string;
  selectedProjectSetIDs: string[];
}

/** Build the team project query without treating an empty worker search as a project-set browse. */
export const buildTeamProjectSearchParams = ({
  page,
  limit,
  status,
  searchMode,
  searchRole,
  word = '',
  currentProjectSetID,
  selectedProjectSetIDs,
}: TeamProjectSearchParamsInput): Record<string, unknown> => {
  const isWorkerSearch = searchMode === 'search-worker';
  const isBrowsingCurrentProjectSet = !isWorkerSearch && !word;
  const params: Record<string, unknown> = {
    page,
    limit,
    status,
    mode: isWorkerSearch || !isBrowsingCurrentProjectSet
      ? searchMode
      : 'search-project-name',
    projectSets: isBrowsingCurrentProjectSet
      ? [currentProjectSetID]
      : selectedProjectSetIDs,
  };

  if (isWorkerSearch) {
    if (searchRole) {
      params.tag = searchRole;
    }
    if (word) {
      params.workerName = word;
    }
  } else if (!isBrowsingCurrentProjectSet) {
    params.word = word;
  }

  return params;
};
