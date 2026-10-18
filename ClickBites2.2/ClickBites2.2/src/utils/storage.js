const USER_KEY = "clickbites_user";
const TOKEN_KEY = "clickbites_token";

export const storage = {
  saveSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  },
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
    catch { return null; }
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};