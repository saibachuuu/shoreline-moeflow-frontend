import React from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@/components/shared/Button';
import { Icon } from '@/components/icon';
import { ListItem } from '@/components/shared/ListItem';
import { Tooltip } from '@/components/shared/Tooltip';
import style from '@/style';
import { getNetworkRoute, setNetworkRouteStorage } from './networkRoute';

function useRouteControl() {
  const { formatMessage } = useIntl();
  const route = getNetworkRoute();
  return {
    label: formatMessage({
      id: route === 'cdn' ? 'site.routeCdn' : 'site.routeDirect',
    }),
    tip: formatMessage({
      id: route === 'cdn' ? 'site.routeCdnTip' : 'site.routeDirectTip',
    }),
    icon: route === 'cdn' ? ('cloud' as const) : ('wifi' as const),
    toggle: () => {
      setNetworkRouteStorage(route === 'cdn' ? 'direct' : 'cdn');
      // Reload clears cached media URLs and reconnects all API/upload clients.
      window.location.reload();
    },
  };
}
export function DesktopRouteControl() {
  const control = useRouteControl();
  return (
    <Tooltip title={control.tip} placement="right">
      <div>
        <ListItem
          className="Dashboard__ListItem Dashboard__MenuOption Dashboard__MenuOption--system"
          name={control.label}
          logo={<Icon className="ListItem__LogoIcon" icon={control.icon} />}
          onClick={control.toggle}
        />
      </div>
    </Tooltip>
  );
}
export function MobileRouteControl() {
  const control = useRouteControl();
  return (
    <Button
      elem="button"
      className="MeM__Button"
      color={style.textColor}
      icon={control.icon}
      onClick={control.toggle}
    >
      {control.label}
    </Button>
  );
}
