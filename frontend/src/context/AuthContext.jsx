import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/auth.js";
import { refreshAccessToken, setSessionExpiredHandler, tokenStore } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true while we check for an existing session on first load
  const [initializing, setInitializing] = useState(true);

  // On page load: if a refresh token exists, trade it for an access token
  // and load the user. This is what keeps you logged in across reloads.
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      if (!tokenStore.getRefresh()) {
        setInitializing(false);
        return;
      }
      try {
        await refreshAccessToken();
        const me = await authApi.fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // If a token refresh fails mid-session, drop back to logged-out state.
  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (username, password) => {
    await authApi.login(username, password);
    setUser(await authApi.fetchMe());
  }, []);

  const signup = useCallback(
    async (payload) => {
      await authApi.register(payload);
      await login(payload.username, payload.password); // log straight in after sign-up
    },
    [login]
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, signup, logout }),
    [user, initializing, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
