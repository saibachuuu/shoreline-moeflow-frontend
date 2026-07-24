import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OSName, Platform } from '@/interfaces';
import { RuntimeConfig } from '@/configs';

export type ThemeMode = 'light' | 'dark';

export interface SiteState {
  osName: OSName;
  platform: Platform;
  newInvitationsCount: number;
  relatedApplicationsCount: number;
  runtimeConfig: RuntimeConfig;
  customSiteTitle: string;
  themeMode: ThemeMode;
  imageTranslatorAutoFocusInput: boolean;
  imageTranslatorShowSymbolInputter: boolean;
  imageTranslatorImageDarkness: number;
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
  imageTranslatorShowSymbolInputter: true,
  imageTranslatorImageDarkness: 0,
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
    setImageTranslatorShowSymbolInputter(
      state,
      action: PayloadAction<boolean>,
    ) {
      state.imageTranslatorShowSymbolInputter = action.payload;
    },
    setImageTranslatorImageDarkness(state, action: PayloadAction<number>) {
      state.imageTranslatorImageDarkness = Math.min(
        99,
        Math.max(0, action.payload),
      );
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
  setImageTranslatorShowSymbolInputter,
  setImageTranslatorImageDarkness,
} = slice.actions;
export default slice.reducer;
