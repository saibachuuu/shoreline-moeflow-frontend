import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OSName, Platform } from '@/interfaces';
import { RuntimeConfig } from '@/configs';

export interface SiteState {
  osName: OSName;
  platform: Platform;
  newInvitationsCount: number;
  relatedApplicationsCount: number;
  runtimeConfig: RuntimeConfig;
  customSiteTitle: string;
}

const initialState: SiteState = {
  osName: null!,
  platform: null!,
  relatedApplicationsCount: 0,
  newInvitationsCount: 0,
  runtimeConfig: null!,
  customSiteTitle: '',
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
  },
});

export const {
  setPlatform,
  setOSName,
  setRelatedApplicationsCount,
  setNewInvitationsCount,
  setRuntimeConfig,
  setCustomSiteTitle,
} = slice.actions;
export default slice.reducer;
