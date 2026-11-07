import { sb } from "./supabase";

export const IDLE = 15 * 6e4;
export const GUEST_KEY = "clickbites_guest_saved";
export const ROLE_IN = { customer: "normal_user", partner: "business_owner", admin: "admin" };

export const ts = (t) => (t ? new Date(t).getTime() : null);
export const hhmm = (t) => (t ? String(t).slice(0, 5) : "");
export const money = (n) => "₱" + Number(n).toFixed(0);
export const fd = (t) =>
  new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function friendly(e) {
  const m = String(e?.message || e || "");
  if (/row-level security|permission denied|not allowed/i.test(m)) return "You do not have permission to do that.";
  if (/foreign key|still referenced/i.test(m)) return "That item is still in use, so it cannot be removed.";
  if (/duplicate key|already exists/i.test(m)) return "That already exists.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "Cannot reach the server. Check your internet connection.";
  return m || "Something went wrong. Please try again.";
}

export function mapProfile(p) {
  return {
    id: p.id,
    email: p.email || "",
    name: p.name || "",
    role: ROLE_IN[p.role] || "normal_user",
    mobile: p.phone || "",
    ucid: p.role === "customer" ? p.customer_code : null,
    code: p.customer_code,
    active: p.is_active !== false,
    avatar: p.avatar_url || "",
  };
}

export const dashPath = (u) => (u.role === "admin" ? "admin" : u.role === "business_owner" ? "owner" : "profile");

/* Shop logos (in /public/logos) keyed by shop name. Used only when a shop has no uploaded image. */
export const LOGOS = {
  "Baybay Grill": "/logos/baybay-grill.jpg",
  "Tita’s Silog House": "/logos/titas-silog-house.jpg",
  "Kusina ni Lola": "/logos/kusina-ni-lola.jpg",
  "Milktea Avenue": "/logos/milktea-avenue.jpg",
  "Burger Boss": "/logos/burger-boss.jpg",
  "Morning Table": "/logos/morning-table.jpg",
  "Daily Harvest": "/logos/daily-harvest.jpg",
};
const BU = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&h=640&q=80`;
export const BANNERS = {
  "Baybay Grill": "/banners/baybay-grill.jpg",
  "Tita’s Silog House": BU("1512058564366-18510be2db19"),
  "Kusina ni Lola": BU("1544025162-d76694265947"),
  "Milktea Avenue": BU("1558857563-b371033873b8"),
  "Burger Boss": BU("1568901346375-23c9450c58cd"),
  "Morning Table": BU("1528207776546-365bb710ee93"),
  "Daily Harvest": BU("1490474418585-ba9bad8fd0ea"),
};

export const catIcon = (n) =>
  ({ "Rice Meals": "utensils", Noodles: "soup", Snacks: "sandwich", Drinks: "cup", Desserts: "cake" })[n] || "tag";

export const mins = (t) => {
  const [h, m] = t.split(":");
  return +h * 60 + +m;
};
export const isOpen = (b, t) => {
  if (!b.opens || !b.closes) return false;
  const x = mins(t),
    o = mins(b.opens),
    c = mins(b.closes);
  return o <= c ? x >= o && x < c : x >= o || x < c;
};
export const nowT = () => new Date().toTimeString().slice(0, 5);

export const validPw = (p, c) =>
  p.length < 8 ? "Password must be at least 8 characters." : p !== c ? "Passwords do not match." : "";
export const validMob = (m) => /^(\+?63|0)9\d{9}$/.test(m.replace(/[\s-]/g, ""));

export const cstat = (c) =>
  c.usedAt ? "used" : c.voidedAt ? "voided" : c.expires < Date.now() ? "expired" : "unused";

/* Resize an image file and return a WebP data URL */
export function webp(file, max = 640) {
  return new Promise((ok, no) => {
    const r = new FileReader();
    r.onerror = no;
    r.onload = () => {
      const i = new Image();
      i.onerror = no;
      i.onload = () => {
        const s = Math.min(1, max / Math.max(i.width, i.height)),
          c = document.createElement("canvas");
        c.width = i.width * s;
        c.height = i.height * s;
        c.getContext("2d").drawImage(i, 0, 0, c.width, c.height);
        ok(c.toDataURL("image/webp", 0.75));
      };
      i.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

export async function uploadImg(bucket, base, dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = base + "." + (blob.type.split("/")[1] || "webp");
  const { error } = await sb.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || "image/webp",
    upsert: true,
  });
  if (error) throw error;
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
}

export const sbErrBody = async (error) => {
  try {
    return (await error.context.json()).error || error.message;
  } catch (e) {
    return error.message;
  }
};
