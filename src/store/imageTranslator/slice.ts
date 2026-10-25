import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getDefaultQuickCharacterItems,
  loadQuickCharacterItems,
  QuickCharacterItem,
} from '@/components/project-file/markers/quickCharacters';
import { loadTipTriggerCharacter } from '@/components/project-file/markers/proofread/tipTriggerCharacter';

export type TranslatorMode = 'source' | 'translator' | 'proofreader' | 'god';

export interface ImageTranslatorState {
  readonly mode: TranslatorMode;
  quickCharacters: QuickCharacterItem[];
  /** 校对模式滑出批注框的触发字符 */
  tipTriggerCharacter: string;
}

export type ImageTranslator = ImageTranslatorState;

const initialState: ImageTranslatorState = {
  mode: 'translator',
  quickCharacters: loadQuickCharacterItems(),
  tipTriggerCharacter: loadTipTriggerCharacter(),
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
    setTipTriggerCharacter(state, action: PayloadAction<string>) {
      state.tipTriggerCharacter = action.payload;
    },
  },
});

export const {
  setImageTranslatorMode,
  setQuickCharacterItems,
  setQuickCharacterItem,
  resetQuickCharacters,
  setTipTriggerCharacter,
} = slice.actions;
export default slice.reducer;
