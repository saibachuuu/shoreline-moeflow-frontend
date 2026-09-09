import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getDefaultQuickCharacterItems,
  loadQuickCharacterItems,
  QuickCharacterItem,
} from '@/components/project-file/markers/quickCharacters';

export type TranslatorMode = 'source' | 'translator' | 'proofreader' | 'god';

export interface ImageTranslatorState {
  readonly mode: TranslatorMode;
  quickCharacters: QuickCharacterItem[];
}

export type ImageTranslator = ImageTranslatorState;

const initialState: ImageTranslatorState = {
  mode: 'translator',
  quickCharacters: loadQuickCharacterItems(),
};

const slice = createSlice({
  name: 'imageTranslator',
  initialState,
  reducers: {
    setImageTranslatorMode(state, action: PayloadAction<TranslatorMode>) {
      state.mode = action.payload;
    },
    setQuickCharacterItems(state, action: PayloadAction<QuickCharacterItem[]>) {
      state.quickCharacters = action.payload;
    },
    setQuickCharacterItem(
      state,
      action: PayloadAction<{ index: number; item: QuickCharacterItem }>,
    ) {
      const { index, item } = action.payload;
      state.quickCharacters[index] = item;
    },
    resetQuickCharacters(state) {
      state.quickCharacters = getDefaultQuickCharacterItems();
    },
  },
});

export const {
  setImageTranslatorMode,
  setQuickCharacterItems,
  setQuickCharacterItem,
  resetQuickCharacters,
} = slice.actions;
export default slice.reducer;
