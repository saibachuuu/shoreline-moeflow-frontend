import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OSName, Platform } from '@/interfaces';
import { RuntimeConfig } from '@/configs';

export type ThemeMode = 'light' | 'dark';
export const SHOW_BETA_BADGE_KEY = 'moeflow_show_beta_badge';

export function getInitialShowBetaBadge(): boolean {
  try {
    const saved = localStorage.getItem(SHOW_BETA_BADGE_KEY);
    return saved === 'true';
  } catch {
    return false;
  }
}

export interface SiteState {
  osName: OSName;
  platform: Platform;
  newInvitationsCount: number;
  relatedApplicationsCount: number;
  runtimeConfig: RuntimeConfig;
  customSiteTitle: string;
  themeMode: ThemeMode;
  imageTranslatorAutoFocusInput: boolean;
  imageTranslatorImageDarkness: number;
  showBetaBadge: boolean;
}

const initialState: SiteState = {
  osName: null!,
  platform: null!,
  relatedApplicationsCount: 0,
  newInvitationsCount: 0,
  runtimeConfig: null!,
  customSiteTitle: '',
  themeMode: 'light',
  imageTranslatorAutoFocusInput: false,
  imageTranslatorImageDarkness: 0,
  showBetaBadge: getInitialShowBetaBadge(),
};
const slice = createSlice({
  name: 'site',
  initialState,
  reducers: {
    setPlatform(state, action: PayloadAction<Platform>) {
      state.platform = action.payload;
    },
    setOSName(state, action: PayloadAction<OSName>) {
      state.osName = action.payload;
    },
    setRelatedApplicationsCount(state, action: PayloadAction<number>) {
      state.relatedApplicationsCount = action.payload;
    },
    setNewInvitationsCount(state, action: PayloadAction<number>) {
      state.newInvitationsCount = action.payload;
    },
    setRuntimeConfig(state, action: PayloadAction<RuntimeConfig>) {
      state.runtimeConfig = action.payload;
    },
    setCustomSiteTitle(state, action: PayloadAction<string>) {
      state.customSiteTitle = action.payload;
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    setImageTranslatorAutoFocusInput(state, action: PayloadAction<boolean>) {
      state.imageTranslatorAutoFocusInput = action.payload;
    },
    setImageTranslatorImageDarkness(state, action: PayloadAction<number>) {
      const val = Number(action.payload);
      state.imageTranslatorImageDarkness = Number.isFinite(val)
        ? Math.min(99, Math.max(0, val))
        : 0;
    },
    setShowBetaBadge(state, action: PayloadAction<boolean>) {
      state.showBetaBadge = action.payload;
    },
  },
});

export const {
  setPlatform,
  setOSName,
  setRelatedApplicationsCount,
  setNewInvitationsCount,
  setRuntimeConfig,
  setCustomSiteTitle,
  setThemeMode,
  setImageTranslatorAutoFocusInput,
  setImageTranslatorImageDarkness,
  setShowBetaBadge,
} = slice.actions;
export default slice.reducer;
