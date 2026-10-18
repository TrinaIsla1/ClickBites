import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { storage } from "../utils/storage";

export function useAuth() {
  const [user, setUser] = useState(storage.getUser());
  const [loading, setLoading] = useState(Boolean(storage.getToken()));

  const refresh = useCallback(async () => {
    if (!storage.getToken()) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
      localStorage.setItem("clickbites_user", JSON.stringify(data.user));
    } catch {
      storage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    user,
    loading,
    setUser,
    signIn: (data) => { storage.saveSession(data); setUser(data.user); },
    signOut: () => { storage.clear(); setUser(null); }
  };
}