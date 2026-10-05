import { request } from '@/apis';
import { toUnderScoreCase } from '@/utils';
export interface PartnerSearchSettings {
  partnerSearchEnabled?: boolean;
  partnerSearchTeamIds?: string[];
  partnerSearchRateLimitSeconds?: number;
  partnerSearchMaxLimit?: number;
}
const url = '/v1/partner-search-query-entry/settings';
export const getSettings = () =>
  request<PartnerSearchSettings>({ method: 'GET', url });
export const saveSettings = (data: PartnerSearchSettings) =>
  request<PartnerSearchSettings>({
    method: 'PUT',
    url,
    data: toUnderScoreCase(data),
  });
