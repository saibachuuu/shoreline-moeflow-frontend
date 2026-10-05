import reducer, { initialState, setUserInfo, setUserToken } from './slice';

const owner = {
  ...initialState,
  id: 'owner',
  token: 'owner-token',
  admin: true,
  canManageSiteAdmins: true,
};

describe('site administrator management capability', () => {
  test('is denied by default, including responses from an older backend', () => {
    expect(initialState.canManageSiteAdmins).toBe(false);
    expect(
      reducer(initialState, setUserInfo({ id: 'admin', admin: true }))
        .canManageSiteAdmins,
    ).toBe(false);
  });

  test('uses a server-granted capability, independently from ordinary admin status', () => {
    const state = reducer(initialState, setUserInfo(owner));
    expect(state.canManageSiteAdmins).toBe(true);
    const delegated = reducer(
      state,
      setUserInfo({ canManageSiteAdmins: false }),
    );
    expect(delegated.admin).toBe(true);
    expect(delegated.canManageSiteAdmins).toBe(false);
  });

  test.each(['', 'another-token', 'owner-token'])(
    'clears the capability on token changes and refreshes: %s',
    (token) => {
      const state = reducer(owner, setUserToken({ token }));
      expect(state.canManageSiteAdmins).toBe(false);
    },
  );

  test('does not retain a prior account capability when identity changes', () => {
    const state = reducer(owner, setUserInfo({ id: 'delegate', admin: true }));
    expect(state.canManageSiteAdmins).toBe(false);
  });

  test('clears capability when administrator status is revoked', () => {
    const state = reducer(owner, setUserInfo({ admin: false }));
    expect(state.canManageSiteAdmins).toBe(false);
  });

  test('does not grant capability to a non-administrator', () => {
    const state = reducer(
      initialState,
      setUserInfo({ canManageSiteAdmins: true }),
    );
    expect(state.canManageSiteAdmins).toBe(false);
  });

  test('preserves capability on unrelated same-account profile edits', () => {
    const state = reducer(owner, setUserInfo({ name: 'new name' }));
    expect(state.canManageSiteAdmins).toBe(true);
  });
});
