function toHyphenCase(value: string | { [propNames: string]: any }) {
  function stringToHyphenCase(value: string) {
    return value.replace(/([A-Z])/g, '-$1').toLowerCase();
  }

  if (typeof value === 'string') {
    return stringToHyphenCase(value);
  } else {
    const newValue: { [key: string]: any } = {};
    for (const key in value) {
      newValue[stringToHyphenCase(key)] = value[key];
    }
    return newValue;
  }
}

const antdVarsSource = {
  primaryColor: '#FF657C',
  infoColor: '#62a4ca',
  successColor: '#52c41a',
  processingColor: '#1890ff',
  errorColor: '#f5222d',
  highlightColor: '#f5222d',
  warningColor: '#faad14',
  normalColor: '#d9d9d9',
  textColor: 'rgba(0, 0, 0, 0.85)',
  textColorSecondary: 'rgba(0, 0, 0, 0.45)',
  textColorInverse: '#fff',
  borderRadiusBase: '8px',
  borderRadiusSm: '4px',
  borderColorBase: '#dbdbdb',
  boxShadowBase:
    '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08),0 9px 28px 8px rgba(0, 0, 0, 0.05)',
};

const otherVars = {
  labelFontFamily: "'Label Number', sans-serif",
  translatorColorBackground: '#4f4f4f',
  backgroundColorLight: '#fafafa',
  backgroundFocus: '#fffbe3',
  textColorLight: 'rgba(0, 0, 0, 0.75)',
  textColorLighter: 'rgba(0, 0, 0, 0.65)',
  textColorLightest: 'rgba(0, 0, 0, 0.55)',
  textColorSecondaryLight: 'rgba(0, 0, 0, 0.35)',
  textColorSecondaryLighter: 'rgba(0, 0, 0, 0.25)',
  textColorSecondaryLightest: 'rgba(0, 0, 0, 0.15)',
  primaryColorDarker: '#d94c66',
  primaryColorLighter: '#ff8f9c',
  primaryColorLightest: '#ffbdc5',
  warningColorLighter: '#ffd583',
  warningColorLightest: '#ffe0a4',
  hoverColor: '#eee',
  activeColor: '#d9d9d9',
  selectedColor: '#e3e3e3',
  widgetButtonHoverBackgroundColor: 'rgba(182, 182, 182, 0.6)',
  widgetButtonActiveBackgroundColor: 'rgba(202, 202, 202, 0.6)',
  widgetButtonActiveColor: '#999',
  navHeight: 40,
  navHeightM: 45,
  tabBarHeightM: 50,
  borderColorLight: '#eeeeee',
  borderColorLighter: '#f7f7f7;',
  contentMaxWidth: 520,
  headerHeight: 60,
  avatarBorderColor: '#eeeeee',
  paddingBase: 15,
};

const antdVarsMSource = {
  fillBody: '#fff',
  fillTap: otherVars.activeColor,
  brandPrimary: antdVarsSource.primaryColor,
  colorTextBase: antdVarsSource.textColor,
  colorTextBaseInverse: antdVarsSource.textColorInverse,
  colorTextSecondary: antdVarsSource.textColorSecondary,
};

const cssVar = (name: string) => `var(--${name})`;

function toCssVarName(key: string) {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

const antdVarsRuntime: Record<string, string> = {};
for (const key of Object.keys(antdVarsSource)) {
  antdVarsRuntime[key] = cssVar(toCssVarName(key));
}

const themedKeys = new Set([
  'translatorColorBackground',
  'backgroundColorLight',
  'backgroundFocus',
  'textColorLight',
  'textColorLighter',
  'textColorLightest',
  'textColorSecondaryLight',
  'textColorSecondaryLighter',
  'textColorSecondaryLightest',
  'primaryColorDarker',
  'primaryColorLighter',
  'primaryColorLightest',
  'warningColorLighter',
  'warningColorLightest',
  'hoverColor',
  'activeColor',
  'selectedColor',
  'widgetButtonHoverBackgroundColor',
  'widgetButtonActiveBackgroundColor',
  'widgetButtonActiveColor',
  'borderColorLight',
  'borderColorLighter',
  'avatarBorderColor',
]);

const runtimeStyle: Record<string, any> = {};
for (const key of Object.keys(otherVars)) {
  if (themedKeys.has(key)) {
    runtimeStyle[key] = cssVar(toCssVarName(key));
  } else {
    runtimeStyle[key] = otherVars[key as keyof typeof otherVars];
  }
}

export default {
  ...antdVarsRuntime,
  ...runtimeStyle,
} as const;

export const antdLessVars = toHyphenCase(antdVarsSource) as Record<string, string>;
export const antdLessVarsM = toHyphenCase(antdVarsMSource) as Record<string, string>;

export const darkThemeVars: Record<string, string> = {
  'primary-color': '#FF657C',
  'info-color': '#62a4ca',
  'success-color': '#52c41a',
  'processing-color': '#1890ff',
  'error-color': '#f5222d',
  'highlight-color': '#f5222d',
  'warning-color': '#faad14',
  'normal-color': '#d9d9d9',
  'text-color': 'rgba(255, 255, 255, 0.85)',
  'text-color-secondary': 'rgba(255, 255, 255, 0.45)',
  'text-color-inverse': '#000',
  'border-radius-base': '8px',
  'border-radius-sm': '4px',
  'border-color-base': '#434343',
  'box-shadow-base':
    '0 3px 6px -4px rgba(255, 255, 255, 0.12), 0 6px 16px 0 rgba(255, 255, 255, 0.08),0 9px 28px 8px rgba(255, 255, 255, 0.05)',
  'translator-color-background': '#666',
  'background-color-light': '#1b1b20',
  'background-focus': '#2a1a1a',
  'text-color-light': 'rgba(255, 255, 255, 0.75)',
  'text-color-lighter': 'rgba(255, 255, 255, 0.65)',
  'text-color-lightest': 'rgba(255, 255, 255, 0.55)',
  'text-color-secondary-light': 'rgba(255, 255, 255, 0.35)',
  'text-color-secondary-lighter': 'rgba(255, 255, 255, 0.25)',
  'text-color-secondary-lightest': 'rgba(255, 255, 255, 0.15)',
  'primary-color-darker': '#d94c66',
  'primary-color-lighter': '#ff8f9c',
  'primary-color-lightest': '#ffbdc5',
  'warning-color-lighter': '#ffd583',
  'warning-color-lightest': '#ffe0a4',
  'hover-color': 'rgba(255, 255, 255, 0.08)',
  'active-color': 'rgba(255, 255, 255, 0.12)',
  'selected-color': 'rgba(255, 255, 255, 0.16)',
  'widget-button-hover-background-color': 'rgba(80, 80, 80, 0.6)',
  'widget-button-active-background-color': 'rgba(100, 100, 100, 0.6)',
  'widget-button-active-color': '#aaa',
  'border-color-light': '#303030',
  'border-color-lighter': '#282828',
  'avatar-border-color': '#303030',
};

export const lightThemeVars: Record<string, string> = {
  'primary-color': '#FF657C',
  'info-color': '#62a4ca',
  'success-color': '#52c41a',
  'processing-color': '#1890ff',
  'error-color': '#f5222d',
  'highlight-color': '#f5222d',
  'warning-color': '#faad14',
  'normal-color': '#d9d9d9',
  'text-color': 'rgba(0, 0, 0, 0.85)',
  'text-color-secondary': 'rgba(0, 0, 0, 0.45)',
  'text-color-inverse': '#fff',
  'border-radius-base': '8px',
  'border-radius-sm': '4px',
  'border-color-base': '#dbdbdb',
  'box-shadow-base':
    '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08),0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  'translator-color-background': '#4f4f4f',
  'background-color-light': '#fafafa',
  'background-focus': '#fffbe3',
  'text-color-light': 'rgba(0, 0, 0, 0.75)',
  'text-color-lighter': 'rgba(0, 0, 0, 0.65)',
  'text-color-lightest': 'rgba(0, 0, 0, 0.55)',
  'text-color-secondary-light': 'rgba(0, 0, 0, 0.35)',
  'text-color-secondary-lighter': 'rgba(0, 0, 0, 0.25)',
  'text-color-secondary-lightest': 'rgba(0, 0, 0, 0.15)',
  'primary-color-darker': '#d94c66',
  'primary-color-lighter': '#ff8f9c',
  'primary-color-lightest': '#ffbdc5',
  'warning-color-lighter': '#ffd583',
  'warning-color-lightest': '#ffe0a4',
  'hover-color': '#eee',
  'active-color': '#d9d9d9',
  'selected-color': '#e3e3e3',
  'widget-button-hover-background-color': 'rgba(182, 182, 182, 0.6)',
  'widget-button-active-background-color': 'rgba(202, 202, 202, 0.6)',
  'widget-button-active-color': '#999',
  'border-color-light': '#eeeeee',
  'border-color-lighter': '#f7f7f7',
  'avatar-border-color': '#eeeeee',
};
