import { storage } from "../utils/storage";

export function isLoggedIn() {
  return Boolean(storage.getToken());
}

export function logout() {
  storage.clear();
}