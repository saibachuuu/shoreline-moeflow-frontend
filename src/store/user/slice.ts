import { createSlice, PayloadAction } from '@reduxjs/toolkit';
export interface Locale {
  id: string;
  intro: string;
  name: string;
}
export interface UserState {
  /** id */
  id: string;
  /** 邮箱 */
  email: string;
  /** 用户名 */
  name: string;
  /** 是否设置头像 */
  hasAvatar: boolean;
  /** 头像地址 */
  avatar: string;
  /** 签名 */
  signature: string;
  /** 区域 */
  locale: Locale;
  /** 用户 Token */
  token: string;
  admin: boolean;
  /** Server-granted permission to grant/revoke site administrators. */
  canManageSiteAdmins?: boolean;
  aliases: string[];
  defaultDisplayName?: string;
}

export type SetUserInfoAction = PayloadAction<
  Partial<Omit<UserState, 'token'>>
>;
export const initialState: UserState = {
  id: '',
  email: '',
  name: '',
  hasAvatar: false,
  avatar: '',
  signature: '',
  locale: {
    id: '',
    intro: '',
    name: '',
  },
  token: '',
  admin: false,
  canManageSiteAdmins: false,
  aliases: [],
  defaultDisplayName: '',
};
const slice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserToken(
      state,
      action: PayloadAction<
        Pick<UserState, 'token'> & {
          rememberMe?: boolean;
          refresh?: boolean;
        }
      >,
    ) {
      state.token = action.payload.token;
      // Fail closed until the current session's capability has been reloaded.
      state.canManageSiteAdmins = false;
      // 之后会触发 saga 获取用户详情
    },
    setUserInfo(state, action: SetUserInfoAction) {
      if (action.payload.id !== undefined && action.payload.id !== state.id) {
        state.canManageSiteAdmins = false;
      }
      let key: keyof typeof action.payload;
      for (key in action.payload) {
        state[key] = action.payload[key] as never;
      }
      if (!state.admin) {
        state.canManageSiteAdmins = false;
      }
    },
  },
});

export const { setUserToken, setUserInfo } = slice.actions;
export default slice.reducer;
