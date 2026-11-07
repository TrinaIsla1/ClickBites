import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sb } from "../lib/supabase";
import {
  BANNERS, GUEST_KEY, IDLE, LOGOS, dashPath, friendly, hhmm, mapProfile, ts,
} from "../lib/utils";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const EMPTY_DB = {
  me: null, users: [], cats: [], businesses: [], products: [], ratings: [], codes: [], saved: {}, reviewers: {},
};
const DEFAULT_F = {
  cat: "All", price: "all", rate: "0", open: "", time: "", foodQ: "", shopsQ: "", sort: "relevance", view: "food", n: 8,
};
const PROFILE_COLS = "id,name,phone,email,role,customer_code,is_active,avatar_url";

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [db, setDb] = useState(EMPTY_DB);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(true);
  const [F, setF] = useState(DEFAULT_F);
  const [shopTab, setShopTab] = useState("Menu");
  const [editId, setEditId] = useState(null);
  const [newCode, setNewCode] = useState(null);
  const [otp, setOtp] = useState(null); // { purpose, email, sent }
  const [resetInfo, setResetInfo] = useState(null); // { email, sent }
  const [quickViewId, setQuickViewId] = useState(null);
  const [toastState, setToastState] = useState({ msg: "", type: "", show: false });

  const dbRef = useRef(db);
  dbRef.current = db;
  const bootingRef = useRef(true);
  const last = useRef(Date.now());
  const expired = useRef(false);
  const toastTimer = useRef();

  /* ---------- small helpers ---------- */
  const toast = useCallback((msg, type = "") => {
    setToastState({ msg, type, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState((s) => ({ ...s, show: false })), 3600);
  }, []);
  const err = (m) => (toast(m, "er"), false);
  const touch = () => {
    last.current = Date.now();
  };
  const go = (p) => navigate("/" + p);

  const user = db.me && db.me.active ? db.me : null;

  const expire = useCallback(() => {
    expired.current = true;
    setDb((d) => ({ ...d, me: null }));
    sb.auth.signOut();
  }, []);

  /* Browser-side idle logout (15 minutes) for shop owners and admins */
  const checkIdle = () => {
    const m = dbRef.current.me;
    if (m && m.role !== "normal_user" && Date.now() - last.current > IDLE) expire();
  };
  useEffect(() => {
    const id = setInterval(() => checkIdle(), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takeExpired = () => {
    const x = expired.current;
    expired.current = false;
    return x;
  };

  /* ---------- Supabase data layer ---------- */
  /* Shops include banner_url. If that column has not been added yet
     (database/supabase-shop-banner.sql), fall back so the site keeps working. */
  const SHOP_COLS = "id,owner_id,name,address,image_url,hours_text,opens_at,closes_at,contact,description,website_url";
  const loadShops = async () => {
    const r = await sb.from("shops").select(SHOP_COLS + ",banner_url").order("id");
    if (r.error && /banner_url/i.test(r.error.message)) return sb.from("shops").select(SHOP_COLS).order("id");
    return r;
  };

  const refresh = useCallback(async () => {
    let me = null;
    const { data: sess } = await sb.auth.getSession();
    const authUser = sess?.session?.user;
    if (authUser) {
      const { data: p } = await sb.from("profiles").select(PROFILE_COLS).eq("id", authUser.id).maybeSingle();
      if (p) {
        if (p.is_active === false) await sb.auth.signOut();
        else me = mapProfile(p);
      }
    }
    const staff = me && me.role !== "normal_user";
    const none = Promise.resolve({ data: null });
    const [c, s, p, r, fv, rc, pr] = await Promise.all([
      sb.from("categories").select("id,name").order("name"),
      loadShops(),
      sb.from("products").select("id,shop_id,name,category_id,description,price,image_url,available").order("id"),
      sb
        .from("reviews")
        .select("id,shop_id,customer_code,score,comment,created_at")
        .order("created_at", { ascending: false }),
      me ? sb.from("favorites").select("product_id").eq("user_id", me.id) : none,
      staff
        ? sb
            .from("receipt_codes")
            .select("id,shop_id,code,reference,created_at,expires_at,used_at,voided_at")
            .order("created_at", { ascending: false })
        : none,
      me?.role === "admin" ? sb.from("profiles").select(PROFILE_COLS).order("created_at") : none,
    ]);
    const bad = [c, s, p, r].find((x) => x.error);
    if (bad) throw bad.error;

    const next = { ...EMPTY_DB, me };
    next.cats = (c.data || []).map((x) => ({ id: String(x.id), name: x.name }));
    next.businesses = (s.data || []).map((x) => ({
      id: String(x.id),
      owner: x.owner_id,
      name: x.name,
      hours: x.hours_text || "",
      opens: hhmm(x.opens_at),
      closes: hhmm(x.closes_at),
      contact: x.contact || "",
      address: x.address || "",
      desc: x.description || "",
      link: x.website_url || "",
      img: x.image_url || "",
      banner: x.banner_url || "",
    }));
    next.products = (p.data || []).map((x) => ({
      id: String(x.id),
      bid: String(x.shop_id),
      cat: x.category_id == null ? "" : String(x.category_id),
      name: x.name,
      price: Number(x.price),
      desc: x.description || "",
      img: x.image_url || "",
      active: !!x.available,
    }));
    next.ratings = (r.data || []).map((x) => ({
      id: String(x.id),
      uid: me && x.customer_code === me.code ? me.id : null,
      bid: String(x.shop_id),
      ucid: x.customer_code,
      score: x.score,
      comment: x.comment || "",
      verified: true,
      at: ts(x.created_at),
    }));
    next.codes = (rc.data || []).map((x) => ({
      id: String(x.id),
      bid: String(x.shop_id),
      code: x.code,
      ref: x.reference || "",
      created: ts(x.created_at),
      expires: ts(x.expires_at),
      usedAt: ts(x.used_at),
      voidedAt: ts(x.voided_at),
    }));
    next.users = (pr.data || []).map(mapProfile);

    /* Reviewer names/pictures (optional view, see database/supabase-review-authors.sql) */
    try {
      const ra = await sb.from("review_authors").select("customer_code,name,avatar_url");
      (ra.data || []).forEach((x) => {
        next.reviewers[x.customer_code] = { name: (x.name || "").trim(), avatar: x.avatar_url || "" };
      });
    } catch (e) {
      /* view not created yet: reviews just show "Verified Customer" */
    }

    if (me) next.saved[me.id] = (fv.data || []).map((x) => String(x.product_id));
    try {
      next.saved.guest = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
    } catch (e) {
      next.saved.guest = [];
    }
    setDb(next);
    return next;
  }, []);

  /* Reload everything; resolves to the fresh data (or the old data on error) */
  const reload = useCallback(async () => {
    try {
      return await refresh();
    } catch (e) {
      console.error(e);
      toast(friendly(e), "er");
      return dbRef.current;
    }
  }, [refresh, toast]);

  useEffect(() => {
    (async () => {
      await reload();
      bootingRef.current = false;
      setBooting(false);
      setLoading(false);
    })();
    const { data: sub } = sb.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT" && !bootingRef.current && dbRef.current.me) setTimeout(() => reload(), 0);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- selectors ---------- */
  const bz = (id) => db.businesses.find((b) => b.id === id);
  const cat = (id) => db.cats.find((c) => c.id === id);
  const prod = (id) => db.products.find((p) => p.id === id);
  const myShop = () => db.businesses.find((b) => b.owner === user?.id);
  const bImg = (b) => b.img || LOGOS[b.name] || db.products.find((p) => p.bid === b.id && p.img)?.img || "";
  const bBanner = (b) => b.banner || BANNERS[b.name] || "";
  const avg = (bid) => {
    const r = db.ratings.filter((x) => x.bid === bid && x.verified);
    return { n: r.length, a: r.length ? r.reduce((s, x) => s + x.score, 0) / r.length : 0 };
  };
  const reviewerOf = (r) => {
    const x =
      db.users.find((u) => u.id === r.uid) ||
      (db.me && db.me.id === r.uid ? db.me : null) ||
      db.reviewers[r.ucid] ||
      null;
    return { name: (x && x.name && x.name.trim()) || "Verified Customer", avatar: (x && x.avatar) || "" };
  };
  const savedSet = () => new Set(db.saved[user?.id || "guest"] || []);

  /* ---------- actions ---------- */
  const need = (r, m) => {
    if (r.error) {
      toast(m || friendly(r.error), "er");
      return false;
    }
    return true;
  };

  /* Returns the user when the role matches, otherwise sends the person to log in */
  const role = (r) => {
    const u = dbRef.current.me;
    if (!u || !u.active || u.role !== r) {
      go("login");
      return null;
    }
    touch();
    return u;
  };

  /* Returns an error message ("" on success) */
  const login = async (e, p) => {
    const { error } = await sb.auth.signInWithPassword({ email: e, password: p });
    if (error) {
      if (/not confirmed/i.test(error.message)) {
        setOtp({ purpose: "signup", email: e, sent: Date.now() });
        await sb.auth.resend({ type: "signup", email: e });
        toast("Please confirm your email. We sent you a new code.");
        go("otp");
        return "";
      }
      if (/banned|suspend/i.test(error.message)) return "This account is suspended. Please contact the administrator.";
      return "Invalid email or password.";
    }
    const next = await reload();
    const u = next.me && next.me.active ? next.me : null;
    if (!u) {
      await sb.auth.signOut();
      return "This account is suspended. Please contact the administrator.";
    }
    touch();
    go(dashPath(u));
    return "";
  };

  const logout = async () => {
    await sb.auth.signOut();
    setDb((d) => ({ ...d, me: null }));
    await reload();
    toast("You have been logged out.");
    go("home");
  };

  const toggleSave = async (id) => {
    const k = user?.id || "guest",
      s = new Set(db.saved[k] || []),
      had = s.has(id);
    if (user) {
      const r = had
        ? await sb.from("favorites").delete().eq("user_id", user.id).eq("product_id", Number(id))
        : await sb.from("favorites").insert({ user_id: user.id, product_id: Number(id) });
      if (!need(r)) return;
    }
    had ? s.delete(id) : s.add(id);
    const arr = [...s];
    setDb((d) => ({ ...d, saved: { ...d.saved, [k]: arr } }));
    if (!user) {
      try {
        localStorage.setItem(GUEST_KEY, JSON.stringify(arr));
      } catch (e) {
        /* ignore */
      }
    }
    toast(had ? "Removed from saved items." : "Saved to your favorites.");
  };

  /* ---------- filters ---------- */
  const resetFilters = () =>
    setF((f) => ({ ...f, cat: "All", price: "all", rate: "0", open: "", time: "", foodQ: "", shopsQ: "", n: 8 }));
  const patchF = (p) => setF((f) => ({ ...f, ...p }));

  const value = {
    // state
    db, user, booting, loading, F, patchF, resetFilters,
    shopTab, setShopTab, editId, setEditId, newCode, setNewCode,
    otp, setOtp, resetInfo, setResetInfo, quickViewId, setQuickViewId,
    toastState,
    // helpers
    toast, err, touch, go, need, role, checkIdle, takeExpired,
    bz, cat, prod, myShop, bImg, bBanner, avg, reviewerOf, savedSet,
    // actions
    reload, login, logout, toggleSave,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
