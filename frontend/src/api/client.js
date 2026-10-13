/**
 * Axios instance + token handling.
 *
 * Token storage strategy:
 * - The short-lived ACCESS token (15 min) lives only in memory (a module
 *   variable). It is never written to localStorage, so a script injected into
 *   the page cannot read it from storage, and it disappears when the tab closes.
 * - The REFRESH token is kept in localStorage so a page reload keeps you
 *   logged in. The backend rotates it on every use and blacklists it on logout,
 *   which limits the damage if it ever leaks.
 * - Production upgrade: move the refresh token into an httpOnly cookie so
 *   JavaScript can't read it at all.
 */
import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const REFRESH_KEY = "tm_refresh";

let accessToken = null;
let onSessionExpired = () => {};

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set({ access, refresh }) {
    if (access) accessToken = access;
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** Lets the AuthContext react (log the user out) when refreshing fails. */
export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

const api = axios.create({ baseURL: API_URL, timeout: 10000 });

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// One shared refresh request, so ten parallel 401s trigger one refresh, not ten.
let refreshPromise = null;

export async function refreshAccessToken() {
  const refresh = tokenStore.getRefresh();
  if (!refresh) throw new Error("No refresh token");
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh/`, { refresh })
      .then(({ data }) => {
        tokenStore.set(data); // rotation returns a new refresh token too
        return data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// When the access token expires, refresh it once and retry the original request.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        const access = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch {
        tokenStore.clear();
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

/** Turn any axios error into one readable sentence for the UI. */
export function getErrorMessage(error, fallback = "Something went wrong. Try again.") {
  if (!error.response) {
    return "Can't reach the server. Check that the backend is running on port 8000.";
  }
  const data = error.response.data;
  if (typeof data === "string") return fallback;
  if (data?.detail) return data.detail;
  if (data && typeof data === "object") {
    const [field, messages] = Object.entries(data)[0] || [];
    const message = Array.isArray(messages) ? messages[0] : messages;
    if (message) {
      return field === "non_field_errors" ? message : `${humanize(field)}: ${message}`;
    }
  }
  return fallback;
}

function humanize(field) {
  const labels = { password2: "Confirm password", due_date: "Due date" };
  return labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
}

export default api;
