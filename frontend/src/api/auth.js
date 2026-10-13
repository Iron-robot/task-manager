import api, { tokenStore } from "./client.js";

export async function login(username, password) {
  const { data } = await api.post("/auth/login/", { username, password });
  tokenStore.set(data);
  return data;
}

export async function register(payload) {
  const { data } = await api.post("/auth/register/", payload);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get("/auth/me/");
  return data;
}

export async function logout() {
  const refresh = tokenStore.getRefresh();
  try {
    // Tell the server to blacklist the refresh token.
    if (refresh && tokenStore.getAccess()) await api.post("/auth/logout/", { refresh });
  } finally {
    // Always clear local tokens, even if the server call fails.
    tokenStore.clear();
  }
}
