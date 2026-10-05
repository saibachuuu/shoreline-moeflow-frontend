import type { FrontendModule } from '../registry';
import {
  getNetworkRoute,
  getCdnApiBaseURL,
  resolveMediaUrl,
} from './networkRoute';
import { configureClient } from './runtime';
import { DesktopRouteControl, MobileRouteControl } from './RouteControl';

export const MODULE: FrontendModule = {
  name: 'network_route',
  runtime: {
    configureClient,
    apiBaseURL: (baseURL) =>
      getNetworkRoute() === 'cdn' ? getCdnApiBaseURL() : baseURL,
    mediaURL: (url) => resolveMediaUrl(url) ?? url,
  },
  desktopSettings: [DesktopRouteControl],
  mobileSettings: [MobileRouteControl],
};
