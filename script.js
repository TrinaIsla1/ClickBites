/* ===== ClickBites (HTML site) connected to Supabase =====
   Data, login and photos live in Supabase (Postgres, Auth, Storage).
   Settings are in config.js. Open the site through a web server (for example
   VS Code "Live Server"), not by double-clicking the file. */
const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const CFG = window.CLICKBITES_CONFIG || {};
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
const IDLE = 15 * 6e4,
  GUEST_KEY = "clickbites_guest_saved";
let DB = { me: null, users: [], cats: [], businesses: [], products: [], ratings: [], codes: [], saved: {} },
  S = {
    stars: 0,
    otp: null,
    reset: null,
    edit: null,
    newCode: null,
    load: true,
    booting: true,
    shopTab: "Overview",
    modalStars: 5,
    last: Date.now(),
  };
let F = {
  cat: "All",
  price: "all",
  rate: "0",
  open: "",
  time: "",
  q: "",
  sort: "relevance",
  view: "food",
  n: 8,
};
const save = () => {}; /* kept so older code that calls save() still works; data is saved to Supabase */

/* ---------- Supabase data layer ---------- */
const ROLE_IN = { customer: "normal_user", partner: "business_owner", admin: "admin" };
const ts = (t) => (t ? new Date(t).getTime() : null);
const hhmm = (t) => (t ? String(t).slice(0, 5) : "");
function friendly(e) {
  const m = String(e?.message || e || "");
  if (/row-level security|permission denied|not allowed/i.test(m)) return "You do not have permission to do that.";
  if (/foreign key|still referenced/i.test(m)) return "That item is still in use, so it cannot be removed.";
  if (/duplicate key|already exists/i.test(m)) return "That already exists.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "Cannot reach the server. Check your internet connection.";
  return m || "Something went wrong. Please try again.";
}
function mapProfile(p) {
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
async function loadMe() {
  DB.me = null;
  const { data } = await sb.auth.getSession();
  const user = data?.session?.user;
  if (!user) return;
  const { data: p } = await sb
    .from("profiles")
    .select("id,name,phone,email,role,customer_code,is_active,avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (!p) return;
  if (p.is_active === false) {
    await sb.auth.signOut();
    return;
  }
  DB.me = mapProfile(p);
}
async function refresh() {
  await loadMe();
  const me = DB.me,
    staff = me && me.role !== "normal_user";
  const none = Promise.resolve({ data: null });
  const [c, s, p, r, fv, rc, pr] = await Promise.all([
    sb.from("categories").select("id,name").order("name"),
    sb
      .from("shops")
      .select("id,owner_id,name,address,image_url,hours_text,opens_at,closes_at,contact,description,website_url")
      .order("id"),
    sb
      .from("products")
      .select("id,shop_id,name,category_id,description,price,image_url,available")
      .order("id"),
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
    me?.role === "admin"
      ? sb
          .from("profiles")
          .select("id,name,phone,email,role,customer_code,is_active,avatar_url")
          .order("created_at")
      : none,
  ]);
  const bad = [c, s, p, r].find((x) => x.error);
  if (bad) throw bad.error;
  DB.cats = (c.data || []).map((x) => ({ id: String(x.id), name: x.name }));
  DB.businesses = (s.data || []).map((x) => ({
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
  }));
  DB.products = (p.data || []).map((x) => ({
    id: String(x.id),
    bid: String(x.shop_id),
    cat: x.category_id == null ? "" : String(x.category_id),
    name: x.name,
    price: Number(x.price),
    desc: x.description || "",
    img: x.image_url || "",
    active: !!x.available,
  }));
  DB.ratings = (r.data || []).map((x) => ({
    id: String(x.id),
    uid: me && x.customer_code === me.code ? me.id : null,
    bid: String(x.shop_id),
    ucid: x.customer_code,
    score: x.score,
    comment: x.comment || "",
    verified: true,
    at: ts(x.created_at),
  }));
  DB.codes = (rc.data || []).map((x) => ({
    id: String(x.id),
    bid: String(x.shop_id),
    code: x.code,
    ref: x.reference || "",
    created: ts(x.created_at),
    expires: ts(x.expires_at),
    usedAt: ts(x.used_at),
    voidedAt: ts(x.voided_at),
  }));
  DB.users = (pr.data || []).map(mapProfile);
  DB.saved = {};
  if (me) DB.saved[me.id] = (fv.data || []).map((x) => String(x.product_id));
  try {
    DB.saved.guest = JSON.parse(localStorage.getItem(GUEST_KEY) || "[]");
  } catch (e) {
    DB.saved.guest = [];
  }
}
async function reload() {
  try {
    await refresh();
  } catch (e) {
    console.error(e);
    toast(friendly(e), "er");
  }
}
async function uploadImg(bucket, base, dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = base + "." + (blob.type.split("/")[1] || "webp");
  const { error } = await sb.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || "image/webp",
    upsert: true,
  });
  if (error) throw error;
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
}
const U = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=85`;

/* ---------- helpers ---------- */
function toast(msg, t = "") {
  const e = $("#toast");
  e.textContent = msg;
  e.style.background = t === "er" ? "#B3261E" : "";
  e.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => e.classList.remove("show"), 3600);
}
const err = (m) => (toast(m, "er"), false);
const money = (n) => "₱" + Number(n).toFixed(0);
const fd = (t) =>
  new Date(t).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const cur = () => {
  const u = DB.me;
  if (!u || !u.active) return null;
  if (u.role !== "normal_user" && Date.now() - S.last > IDLE) {
    DB.me = null;
    S.expired = true;
    sb.auth.signOut();
    return null;
  }
  return u;
};
const touch = () => {
  S.last = Date.now();
};
const dashPath = (u) =>
  u.role === "admin"
    ? "admin"
    : u.role === "business_owner"
      ? "owner"
      : "profile";
const bz = (id) => DB.businesses.find((b) => b.id === id),
  cat = (id) => DB.cats.find((c) => c.id === id),
  prod = (id) => DB.products.find((p) => p.id === id);
const myShop = () => DB.businesses.find((b) => b.owner === cur()?.id);
const bImg = (b) =>
  b.img || DB.products.find((p) => p.bid === b.id && p.img)?.img || "";
const catIcon = (n) =>
  ({
    "Rice Meals": "utensils",
    Noodles: "soup",
    Snacks: "sandwich",
    Drinks: "cup",
    Desserts: "cake",
  })[n] || "tag";
function avg(bid) {
  const r = DB.ratings.filter((x) => x.bid === bid && x.verified);
  return {
    n: r.length,
    a: r.length ? r.reduce((s, x) => s + x.score, 0) / r.length : 0,
  };
}
const rateHtml = (bid) => {
  const r = avg(bid);
  return r.n
    ? `<span class="stars">${icon("star")} ${r.a.toFixed(1)}</span> <span class="muted">(${r.n} verified)</span>`
    : `<span class="muted">No verified ratings yet</span>`;
};
const mins = (t) => {
  const [h, m] = t.split(":");
  return +h * 60 + +m;
};
const isOpen = (b, t) => {
  if (!b.opens || !b.closes) return false;
  const x = mins(t),
    o = mins(b.opens),
    c = mins(b.closes);
  return o <= c ? x >= o && x < c : x >= o || x < c;
};
const nowT = () => new Date().toTimeString().slice(0, 5);
const photo = (src, alt) =>
  src
    ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.style.visibility='hidden'">`
    : `<div class="ph" role="img" aria-label="${esc(alt)}">${icon("utensils")}</div>`;
const savedSet = () => new Set(DB.saved[cur()?.id || "guest"] || []);
const field = (l, i) => `<div class="field"><label>${l}</label>${i}</div>`;
const validPw = (p, c) =>
  p.length < 8
    ? "Password must be at least 8 characters."
    : p !== c
      ? "Passwords do not match."
      : "";
const validMob = (m) => /^(\+?63|0)9\d{9}$/.test(m.replace(/[\s-]/g, ""));
function webp(file) {
  return new Promise((ok, no) => {
    const r = new FileReader();
    r.onerror = no;
    r.onload = () => {
      const i = new Image();
      i.onerror = no;
      i.onload = () => {
        const s = Math.min(1, 640 / Math.max(i.width, i.height)),
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

function productCard(p) {
  const b = bz(p.bid),
    sv = savedSet().has(p.id),
    openNow = b ? isOpen(b, nowT()) : false;
  
  return `<article class="food-card" tabindex="0" aria-label="View ${esc(p.name)}">
    <div class="food-photo" data-act="quickview" data-id="${p.id}">
      ${photo(p.img, p.name)}
      <span class="tag">${esc(cat(p.cat)?.name)}</span>
      <span class="status-badge ${openNow ? "open" : "closed"}">${openNow ? "OPEN" : "CLOSED"}</span>
      <button class="heart ${sv ? "saved" : ""}" data-act="save" data-id="${p.id}" aria-label="Save ${esc(p.name)}">
        ${icon("heart")}
      </button>
    </div>
    <div class="food-info">
      <div class="food-meta">
        <span>${esc(b ? b.name : "")}</span>
        <span>${rateHtml(p.bid)}</span>
      </div>
      <h3 data-act="quickview" data-id="${p.id}" style="cursor:pointer;">${esc(p.name)}</h3>
      <p class="food-desc">${esc(p.desc)}</p>
      <div class="food-footer">
        <span class="price">${money(p.price)}</span>
        <button class="view-link" data-act="quickview" data-id="${p.id}">View Item</button>
      </div>
    </div>
  </article>`;
}

function shopCard(b) {
  const im = bImg(b),
    openNow = isOpen(b, nowT());
  return `<article class="shop-strip" data-go="shop/${b.id}" tabindex="0" aria-label="View ${esc(b.name)}">
    <div class="shop-photo">
      ${im ? `<img class="shop-avatar" src="${esc(im)}" alt="${esc(b.name)}" loading="lazy" onerror="this.style.visibility='hidden'">` : `<div class="shop-avatar ph">${icon("store")}</div>`}
      <span class="status-badge ${openNow ? "open" : "closed"}">${openNow ? "OPEN" : "CLOSED"}</span>
    </div>
    <div class="grow">
      <div>
        <h3 style="margin:0 0 4px">${esc(b.name)}</h3>
        <div class="muted" style="font-size:12px; margin-bottom: 6px;">${esc(b.hours || "Hours not set")}</div>
        <div>${rateHtml(b.id)}</div>
      </div>
      <div class="shop-strip-footer">
        <span class="view-link" style="width:100%;">View shop</span>
      </div>
    </div>
  </article>`;
}
const pageTitle = (eyebrow, title, sub = "") =>
  `<div class="section-head"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${sub ? `<p class="muted" style="margin:0">${sub}</p>` : ""}</div></div>`;
const emptyBox = (ic, t, p, btn = "") =>
  `<div class="empty"><div class="emoji">${icon(ic)}</div><h3>${t}</h3><p class="muted">${p}</p>${btn}</div>`;
const skeleton = () =>
  `<div class="food-grid">${'<div class="sk"></div>'.repeat(8)}</div>`;

/* ---------- discovery ---------- */
function home() {
  const feed = DB.products.filter((p) => p.active && bz(p.bid)).slice(0, 4);
  return `<section class="hero"><div class="container"><div class="hero-panel"><div class="hero-copy"><div class="eyebrow">Your city, your flavors</div><h1>Discover local food in <span style="color:var(--lavender)">Calbayog City.</span></h1><p>Find neighborhood food spots, explore their menus, and support the people behind your favorite local flavors.</p><form class="searchbox" data-form="search"><span class="search-icon">${icon("search")}</span><input name="q" placeholder="Search shops or food..." aria-label="Search shops or food"><button class="btn btn-primary" type="submit">Search</button></form><div class="hero-actions" style="margin-top:15px"><button class="btn btn-primary" data-go="search">Explore food</button><button class="btn btn-ghost" data-go="shops">Browse all shops</button></div></div><div class="hero-image" role="img" aria-label="A delicious local meal"></div></div></div></section>
<section class="section"><div class="container">${pageTitle("Browse by craving", "Popular categories", "A quick way to discover something you will love.")}<div class="category-row">${[...DB.cats.slice(0, 5), { name: "All" }].map((c) => `<button class="category ${F.cat === c.name ? "selected" : ""}" data-act="cat" data-id="${esc(c.name)}"><span class="emoji">${icon(c.name === "All" ? "grid" : catIcon(c.name))}</span><strong>${c.name === "All" ? "All categories" : esc(c.name)}</strong></button>`).join("")}</div></div></section>
<section class="section" style="padding-top:5px"><div class="container"><div class="section-head"><div><div class="eyebrow">Handpicked for you</div><h2>Featured food</h2><p class="muted" style="margin:0">Browse photos, prices, ratings, and the shops that make them.</p></div><button class="btn btn-ghost" data-go="search">See all food ${icon("search")}</button></div>${S.load ? skeleton() : feed.length ? `<div class="food-grid">${feed.map(productCard).join("")}</div>` : emptyBox("utensils", "No food listed yet", "Check back soon.")}</div></section>`;
}
function prodPass(p) {
  const b = bz(p.bid);
  if (!b || !p.active) return false;
  const q = F.q.toLowerCase(),
    c = cat(p.cat)?.name;
  if (F.cat !== "All" && c !== F.cat) return false;
  if (F.price === "low" && p.price >= 100) return false;
  if (F.price === "mid" && (p.price < 100 || p.price > 150)) return false;
  if (F.price === "high" && p.price <= 150) return false;
  return (
    bizOK(b) && (!q || `${p.name} ${b.name} ${c}`.toLowerCase().includes(q))
  );
}
function bizOK(b) {
  if (F.rate !== "0") {
    const r = avg(b.id);
    if (!r.n || r.a < +F.rate) return false;
  }
  if (F.open === "now" && !isOpen(b, nowT())) return false;
  if (F.open === "at" && (!F.time || !isOpen(b, F.time))) return false;
  return true;
}

function searchPage() {
  const L = DB.products.filter(prodPass);
  if (F.sort === "price") L.sort((a, b) => a.price - b.price);
  if (F.sort === "rating") L.sort((a, b) => avg(b.bid).a - avg(a.bid).a);

  const chips = [];
  if (F.cat !== "All") chips.push(["cat", F.cat]);
  if (F.price !== "all")
    chips.push([
      "price",
      { low: "Under ₱100", mid: "₱100–₱150", high: "Above ₱150" }[F.price],
    ]);
  if (F.rate !== "0") chips.push(["rate", F.rate + "★ and up"]);
  if (F.open)
    chips.push([
      "open",
      F.open === "now" ? "Open now" : "Open at " + (F.time || "…"),
    ]);
  if (F.q) chips.push(["q", "“" + F.q + "”"]);

  const sel = (v, cur_) => (v === cur_ ? "selected" : "");
  const results = S.load
    ? skeleton()
    : L.length
      ? `<div class="food-grid" style="grid-template-columns:repeat(auto-fill, minmax(clamp(200px, 22vw, 260px), 1fr))">${L.slice(0, F.n).map(productCard).join("")}</div>${L.length > F.n ? `<p style="text-align:center;margin-top:18px"><button class="btn btn-ghost" data-act="more">Load more</button></p>` : ""}`
      : `<div class="empty"><div class="emoji">${icon("search")}</div><h3>No food found</h3><p class="muted">Try another keyword or clear one or more filters.</p><div class="chips" style="justify-content:center">${DB.cats
          .slice(0, 4)
          .map(
            (c) =>
              `<button data-act="cat" data-id="${esc(c.name)}">${esc(c.name)}</button>`,
          )
          .join(
            "",
          )}</div><button class="btn btn-soft" data-act="clear">Clear filters</button></div>`;

  return `<section class="section"><div class="container">
<form class="searchbox" data-form="search" style="max-width:none;margin-bottom:22px"><span class="search-icon">${icon("search")}</span><input name="q" value="${esc(F.q)}" placeholder="Try burger, rice meals, or a food item..." aria-label="Search food"><button class="btn btn-primary">Search</button></form>

<aside class="panel filters-top-bar" style="margin-bottom: 22px;">
  <div class="results-head" style="margin-bottom: 12px;">
    <h3 style="margin:0; font-size:15px; display:flex; align-items:center; gap:6px;">${icon("tag")} Filters</h3>
    <button class="link" data-act="clear" style="font-size:13px;">Clear all</button>
  </div>
  <div class="filter-grid">
    <div class="field" style="margin:0;">
      <label for="fCat">Category</label>
      <select id="fCat" data-f="cat">
        <option value="All" ${sel("All", F.cat)}>All Categories</option>
        ${DB.cats.map((c) => `<option value="${esc(c.name)}" ${sel(c.name, F.cat)}>${esc(c.name)}</option>`).join("")}
      </select>
    </div>
    <div class="field" style="margin:0;">
      <label for="fPrice">Price range</label>
      <select id="fPrice" data-f="price">
        <option value="all">Any price</option>
        <option value="low" ${sel("low", F.price)}>Under ₱100</option>
        <option value="mid" ${sel("mid", F.price)}>₱100–₱150</option>
        <option value="high" ${sel("high", F.price)}>Above ₱150</option>
      </select>
    </div>
    <div class="field" style="margin:0;">
      <label for="fRate">Minimum rating (verified)</label>
      <select id="fRate" data-f="rate">
        <option value="0">Any rating</option>
        <option value="5" ${sel("5", F.rate)}>5</option>
        <option value="4" ${sel("4", F.rate)}>4</option>
        <option value="3" ${sel("3", F.rate)}>3</option>
        <option value="2" ${sel("2", F.rate)}>2</option>
        <option value="1" ${sel("1", F.rate)}>1</option>
      </select>
    </div>
    <div class="field" style="margin:0;">
      <label for="fOpen">Operating hours</label>
      <select id="fOpen" data-f="open">
        <option value="">Any time</option>
        <option value="now" ${sel("now", F.open)}>Open now</option>
        <option value="at" ${sel("at", F.open)}>Open at…</option>
      </select>
    </div>
    ${F.open === "at" ? `<div class="field" style="margin:0;"><label>Select Time</label><input type="time" data-f="time" value="${F.time}"></div>` : ""}
  </div>
</aside>

<div>
  <div class="results-head">
    <div><strong>${L.length} results</strong><div class="muted" style="font-size:12px">${F.q ? `For “${esc(F.q)}”` : "Local food in Calbayog City"}</div></div>
    <select data-f="sort" class="field" style="margin:0;width:auto;padding:8px 12px;border:1px solid var(--line);border-radius:9px;font-size:13px;"><option value="relevance">Sort: Recommended</option><option value="price" ${sel("price", F.sort)}>Price: low to high</option><option value="rating" ${sel("rating", F.sort)}>Highest rated</option></select>
  </div>
  ${chips.length ? `<div class="chips" style="margin-bottom:16px;">${chips.map((c) => `<button data-act="unchip" data-id="${c[0]}">${esc(c[1])} ×</button>`).join("")}</div>` : ""}
  ${results}
</div>

</div></section>`;
}

function shopsPage() {
  const q = F.q.toLowerCase();
  const L = DB.businesses.filter(
    (b) => bizOK(b) && (!q || b.name.toLowerCase().includes(q) || b.address.toLowerCase().includes(q))
  );
  if (F.sort === "rating") L.sort((a, b) => avg(b.id).a - avg(a.id).a);

  return `<section class="section"><div class="container">
    ${pageTitle("Meet the makers", "Local shops to know", "Explore local food spots and businesses around Calbayog City.")}
    <form class="searchbox" data-form="searchShops" style="max-width:none;margin-bottom:22px">
      <span class="search-icon">${icon("search")}</span>
      <input name="q" value="${esc(F.q)}" placeholder="Search shops by name or address..." aria-label="Search shops">
      <button class="btn btn-primary">Search</button>
    </form>
    <div class="results-head">
      <div><strong>${L.length} local shops found</strong></div>
    </div>
    ${
      L.length
        ? `<div class="food-grid">${L.map(shopCard).join("")}</div>`
        : emptyBox("store", "No shops found", "Try searching for a different shop name or clear search.", `<button class="btn btn-soft" data-act="clear">Clear search</button>`)
    }
  </div></section>`;
}
function shopPage(id) {
  const b = bz(id);
  if (!b)
    return emptyBox(
      "store",
      "Shop not found",
      "This listing may have been removed.",
      `<button class="btn btn-primary" data-go="home">Back home</button>`,
    );

  const P = DB.products.filter((p) => p.bid === b.id && p.active),
    R = DB.ratings
      .filter((r) => r.bid === b.id && r.verified)
      .sort((a, c) => c.at - a.at),
    im = bImg(b),
    t = S.shopTab;

  const menu = P.length
    ? `<div class="food-grid">${P.map(productCard).join("")}</div>`
    : emptyBox(
        "utensils",
        "No products listed yet",
        "This shop has not added its menu.",
      );
  const info = `<p>${icon("store")} ${esc(b.address || "Address not set")}<br>${icon("phone")} ${esc(b.contact || "—")}<br>${icon("clock")} ${esc(b.hours || "—")}</p>`;

  const body =
    t === "Menu"
      ? menu
      : t === "Reviews"
        ? `<div class="panel"><div class="results-head"><div><h3 style="margin:0">Customer feedback</h3><div>${rateHtml(b.id)}</div></div><button class="btn btn-primary" data-go="review/${b.id}">Write a review</button></div><div class="notice">Verified Purchase feedback is linked to a valid receipt code issued by this shop.</div>${R.length ? R.map((r) => `<div class="rev"><span class="stars">${icon("star")} ${r.score}</span> <span class="vp">${icon("shield")} Verified Purchase</span><p>${esc(r.comment || "")}</p><span class="muted">${new Date(r.at).toLocaleDateString()}</span></div>`).join("") : `<p class="muted">No verified feedback yet.</p>`}</div>`
        : t === "About"
          ? `<div class="panel"><h3>About ${esc(b.name)}</h3><p>${esc(b.desc)}</p>${info}</div>`
          : `<div style="display: flex; flex-direction: column; gap: 24px;">
              <div class="panel">
                <h3>About the shop</h3>
                <p>${esc(b.desc)}</p>
                ${info}
              </div>
              <div>
                <h3>Menu highlights</h3>
                ${P.length ? `<div class="food-grid" style="grid-template-columns:repeat(auto-fill, minmax(220px, 1fr))">${P.slice(0, 4).map(productCard).join("")}</div>` : `<p class="muted">No products listed yet.</p>`}
              </div>
            </div>`;

  return `<section class="section">
    <div class="container">
      <div class="shop-cover">${photo(im, b.name + " cover photo")}</div>
      <div class="shop-title-row" style="background:#ffffff; border-radius:12px; padding:22px 28px; box-shadow:0 2px 10px rgba(0,0,0,0.06); margin-top:-30px; position:relative; z-index:2; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div class="eyebrow" style="font-size:13px; font-weight:700; letter-spacing:0.5px; margin-bottom:2px;">Local business</div>
          <h2 style="margin:4px 0; font-size:28px; font-weight:800; line-height:1.2;">${esc(b.name)}</h2>
          <div class="muted">${rateHtml(b.id)}</div>
        </div>
        <button class="btn btn-primary" data-act="visit" data-id="${b.id}" style="font-size:13px; flex-shrink:0;">Visit main page ${icon("store")}</button>
      </div>
      <div class="tabs" style="margin-top:20px;">${["Overview", "Menu", "Reviews", "About"].map((x) => `<button class="${t === x ? "active" : ""}" data-act="stab" data-id="${x}">${x}</button>`).join("")}</div>
      ${body}
    </div>
  </section>`;
}

/* ---------- floating quickview modal functions ---------- */
function openQuickView(id) {
  const p = prod(id),
    b = p && bz(p.bid);
  if (!p || !b) return;

  S.modalStars = 5;
  const modal = $("#quickViewModal");
  const modalBody = $("#modalBody");
  const R = DB.ratings
    .filter((r) => r.bid === b.id && r.verified)
    .sort((a, c) => c.at - a.at);

  const starButtons = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<button type="button" data-act="modalStar" data-id="${n}" style="background:none; border:none; font-size:16px; cursor:pointer; padding:0 1px; color:${
          n <= S.modalStars ? "#f59e0b" : "#cbd5e1"
        };">★</button>`,
    )
    .join("");

  modalBody.innerHTML = `
    <div class="modal-hero">
      ${photo(p.img, p.name)}
      <span class="tag">${esc(cat(p.cat)?.name)}</span>
    </div>
    <div class="modal-content">
      <div class="modal-header-row">
        <h2>${esc(p.name)}</h2>
        <span class="modal-price">${money(p.price)}</span>
      </div>
      <p class="muted" style="margin:0 0 14px; font-size:13px;">${esc(p.desc)}</p>
      
      <div class="modal-shop-card">
        <h4>${icon("store")} ${esc(b.name)}</h4>
        <div class="modal-shop-info">
          <div>📍 ${esc(b.address || "Calbayog City")}</div>
          <div>📞 ${esc(b.contact || "N/A")}</div>
          <div>⏰ ${esc(b.hours || "Hours not set")}</div>
          <div style="margin-top:6px;">
            <button type="button" class="link" data-act="viewShopDetails" data-id="${b.id}" style="font-size:12px; border:none; background:none; cursor:pointer; padding:0;">View Shop →</button>
          </div>
        </div>
      </div>

      <div class="modal-reviews-section">
        <div class="modal-reviews-head">
          <strong style="font-size:13px; color:var(--navy);">Verified Customer Reviews</strong>
          <span style="font-size:12px;" class="muted">${rateHtml(b.id)}</span>
          <span class="pill" style="margin-left:auto; font-size:10px; background:#e3f4e4; color:#1b6b25;">In-Store Protected</span>
        </div>

        <form class="modal-review-form" data-form="reviewModal" data-bid="${b.id}" style="margin-top:10px;">
          <details open class="modal-review-details">
            <summary style="font-size:12px; font-weight:700; cursor:pointer; color:var(--navy); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
              <span>▼ Write Verified Review</span>
              <span id="modalStarGroup" style="display:inline-flex; align-items:center;">
                ${starButtons} (<span id="modalStarNum">${S.modalStars}</span>/5)
              </span>
            </summary>
            <div style="display:flex; gap:8px; margin-bottom:8px;">
              <input name="vc" maxlength="12" placeholder="Enter In-Store Receipt Code" style="flex:1; padding:7px 10px; font-size:12px; border:1px solid var(--line); border-radius:8px;" required>
              <span class="pill" style="font-size:10px; align-self:center;">Required</span>
            </div>
            <textarea name="cm" placeholder="How was your actual dining experience?" style="width:100%; height:55px; font-size:12px; padding:8px; border:1px solid var(--line); border-radius:8px; resize:none; margin-bottom:8px;"></textarea>
            <div class="err" id="modalEr" style="font-size:11px; margin-bottom:6px;"></div>
            <button class="btn btn-primary btn-small" style="width:100%; border-radius:8px;">Submit Verified Review</button>
          </details>
        </form>

        <div class="modal-review-list" style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
          ${
            R.length
              ? R.map(
                  (r) => `
            <div class="modal-rev-item">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; font-size:12px;">${esc(r.ucid || "Verified Customer")} <span class="vp" style="font-size:9px; padding:1px 5px;">Verified Customer</span></span>
                <span class="stars" style="font-size:12px;">★ ${Number(r.score).toFixed(1)}</span>
              </div>
              <p style="margin:4px 0 2px; font-size:11px; color:#4b5563;">${esc(r.comment || "No comment provided.")}</p>
              <span class="muted" style="font-size:10px;">${new Date(r.at).toISOString().split("T")[0]}</span>
            </div>
          `,
                ).join("")
              : `<p class="muted" style="font-size:11px; text-align:center; padding:8px 0;">No verified reviews yet.</p>`
          }
        </div>
      </div>
    </div>
  `;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = $("#quickViewModal");
  if (modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
}

/* ---------- auth ---------- */
function auth(type, arg) {
  const C = {
    signup: [
      "Create your account",
      "One page for everyone. Shop owners and admins: enter your email and password to continue.",
      "Continue",
    ],
    login: [
      "Welcome back",
      "Log in to continue exploring local food.",
      "Log in",
    ],
    otp: [
      "Verify your email address",
      "Enter the code we emailed you. It is valid for 5 minutes.",
      "Verify code",
    ],
    forgot: [
      "Reset your password",
      "Enter your account email and we will send you a reset code.",
      "Send reset code",
    ],
    reset: [
      "Choose a new password",
      "Create a new password and confirm it below.",
      "Save new password",
    ],
    "reset-sms": [
      "Enter your reset code",
      "Type the code from your email and choose a new password.",
      "Save new password",
    ],
  }[type];

  const inp = (n, l, t = "text", ph = "") =>
    field(
      l,
      t === "password"
        ? `<div class="password-wrap">
           <input name="${n}" type="password" placeholder="${ph}">
           <button type="button" class="password-toggle"
             data-act="togglePassword"
             aria-label="Show password">Show</button>
         </div>`
        : `<input name="${n}" type="${t}" placeholder="${ph}">`,
    );

  let f = "";
  if (type === "signup")
    f =
      inp("name", "Full name (new customers)", "text", "Enter your full name") +
      inp("e", "Email address", "email", "you@example.com") +
      inp("m", "Mobile number (new customers)", "tel", "09XX XXX XXXX") +
      inp("p", "Password", "password", "At least 8 characters") +
      inp("c", "Confirm password (new customers)", "password", "Re-enter password") +
      `<label class="checkline"><input type="checkbox" name="t"> I agree to the Terms and Privacy Policy (new customers).</label>`;
  if (type === "login")
    f =
      inp("e", "Email address", "email", "you@example.com") +
      inp("p", "Password", "password", "Enter your password") +
      `<div style="text-align:right;margin-bottom:15px"><a class="link" href="#forgot">Forgot password?</a></div>`;
  if (type === "otp")
    f = !S.otp
      ? ""
      : `<div class="mail">We sent a code to <b>${esc(S.otp.email)}</b>. Check your inbox (and spam folder).</div>` +
        inp("o", "Verification code", "text", "Enter the code") +
        `<button class="btn btn-ghost btn-small" type="button" data-act="resend">Resend code</button>`;
  if (type === "forgot") f = inp("e", "Email address", "email", "you@example.com");
  if (type === "reset" || type === "reset-sms")
    f =
      (type === "reset-sms" ? inp("o", "Reset code from your email", "text", "Enter the code") : "") +
      inp("p", "New password", "password", "At least 8 characters") +
      inp("c", "Confirm new password", "password", "Re-enter new password") +
      (type === "reset-sms"
        ? `<button class="btn btn-ghost btn-small" type="button" data-act="resendReset">Send a new code</button>`
        : "");
  const mail = "";
  const foot = {
    signup: `Already have an account? <a class="link" href="#login">Log in</a>`,
    login: `New to ClickBites? <a class="link" href="#signup">Create an account</a>`,
    otp: `Wrong email? <a class="link" href="#signup">Go back</a>`,
    forgot: `Remembered it? <a class="link" href="#login">Log in</a>`,
    reset: `<a class="link" href="#login">Back to log in</a>`,
    "reset-sms": `<a class="link" href="#login">Back to log in</a>`,
  }[type];
  return `<section class="container"><div class="auth-wrap"><aside class="auth-aside"><div><div class="brand"><span class="brand-mark"><img src="logo.jpg" alt=""></span><span>Click<span style="color:var(--lavender)">Bites</span></span></div><h2 style="margin-top:35px">Support local.<br>Eat local.<br>Love local.</h2><p>Discover the food and people that make Calbayog City special.</p></div><div class="art">${icon("utensils")}</div><small>Food discovery starts here.</small></aside><div class="auth-card"><div class="eyebrow">ClickBites account</div><h2>${C[0]}</h2><p class="muted">${C[1]}</p><form data-form="${type}" ${type === "reset" ? `data-token="${esc(arg)}"` : ""} novalidate>${f}<div class="err" id="er"></div><button class="btn btn-primary" style="width:100%;margin-top:5px" ${type === "otp" && !S.otp ? "disabled" : ""}>${C[2]}</button></form>${mail}<p class="form-note" style="margin-top:18px">${foot}</p></div></div></section>`;
}
async function login(e, p) {
  const { error } = await sb.auth.signInWithPassword({ email: e, password: p });
  if (error) {
    if (/not confirmed/i.test(error.message)) {
      S.otp = { purpose: "signup", email: e, sent: Date.now() };
      await sb.auth.resend({ type: "signup", email: e });
      toast("Please confirm your email. We sent you a new code.");
      go("otp");
      return "";
    }
    if (/banned|suspend/i.test(error.message))
      return "This account is suspended. Please contact the administrator.";
    return "Invalid email or password.";
  }
  await reload();
  const u = cur();
  if (!u) {
    await sb.auth.signOut();
    return "This account is suspended. Please contact the administrator.";
  }
  S.last = Date.now();
  updNav();
  go(dashPath(u));
  return "";
}

/* ---------- feedback ---------- */
function reviewPage(id) {
  const u = cur(),
    b = bz(id) || DB.businesses[0],
    ex = u && DB.ratings.find((r) => r.uid === u.id && r.bid === b.id);
  S.stars = ex ? ex.score : 0;
  const stars = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<button type="button" data-act="star" data-id="${n}" class="${n <= S.stars ? "active" : ""}" aria-label="Rate ${n} stars">★</button>`,
    )
    .join("");
  return `<section class="section"><div class="container" style="max-width:850px">${pageTitle("Share your experience", ex ? "Edit your review" : "Review a local shop", "Verified feedback helps people discover trusted local businesses.")}<div class="grid-two"><form class="panel" data-form="review">${field("Choose a shop", `<select name="b" data-act="pickshop">${DB.businesses.map((s) => `<option value="${s.id}" ${s.id === b.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>`)}<label style="font-weight:700">Your rating</label><div class="review-stars">${stars}</div>${field("Comment (optional)", `<textarea name="cm" maxlength="500" placeholder="What was your experience?">${esc(ex?.comment)}</textarea>`)}${ex ? `<div class="notice">You already rated this shop. You can edit your rating without a new code.</div>` : field("Verification code from receipt", `<input name="vc" maxlength="12" autocomplete="off" style="text-transform:uppercase" placeholder="Enter 8-character code">`)}<div class="err" id="er"></div><button class="btn btn-primary">${ex ? "Save changes" : "Submit review"}</button>${u ? "" : `<p class="form-note">You need to <a class="link" href="#login">log in</a> as a customer to submit feedback.</p>`}</form><aside class="panel"><h3>How verified reviews work</h3><p>01 · Visit a participating shop.</p><p>02 · Keep your receipt with the verification code.</p><p>03 · Sign in to your account.</p><p>04 · Enter the code and submit your rating.</p><div class="notice">The server checks your account, the shop, code expiry and single-use status. A successful review gets a Verified Purchase label.</div></aside></div></div></section>`;
}
async function submitReview(f) {
  const u = cur(),
    E = (m) => (($("#er").textContent = m), false);
  if (!u) return go("login") || toast("Please log in to review a shop.", "er");
  if (u.role !== "normal_user")
    return E("Only customer accounts can submit feedback.");
  const bid = f.b.value,
    comment = f.cm.value.trim(),
    ex = DB.ratings.find((r) => r.uid === u.id && r.bid === bid);
  if (!S.stars) return E("Please choose a star rating.");
  let res;
  if (ex) {
    res = await sb.rpc("edit_review", { p_shop_id: Number(bid), p_score: S.stars, p_comment: comment });
  } else {
    const raw = f.vc.value.trim().toUpperCase().replace(/\s/g, "");
    if (!raw) return E("Please enter the code from your receipt.");
    res = await sb.rpc("submit_review", { p_shop_id: Number(bid), p_code: raw, p_score: S.stars, p_comment: comment });
  }
  if (res.error) return E(friendly(res.error));
  if (!res.data?.ok) return E(res.data?.error || "Could not save your review.");
  await reload();
  toast(ex ? "Your review was updated." : "Verified feedback saved. Thank you!");
  S.shopTab = "Reviews";
  go("shop/" + bid);
}
function profilePage(tab = "profile") {
  const u = cur(),
    sv = DB.products.filter((p) => savedSet().has(p.id) && bz(p.bid)),
    R = DB.ratings.filter((r) => r.uid === u.id);

  const T = [["profile", "My profile", "user"]];
  if (u.role === "normal_user") {
    T.push(["saved", "Saved food", "heart"]);
    T.push(["feedback", "My feedback", "review"]);
  }

  let h = "";

  if (tab === "profile") {
    // Conditional profile picture markup depending on role
    const photoSection = u.role === "admin" ? `
      <div class="profile-avatar">
        ${u.avatar ? `<img src="${esc(u.avatar)}" alt="Profile picture">` : icon("user")}
      </div>
    ` : `
      <div class="profile-avatar-wrapper" style="position:relative; display:inline-block;">
        <div class="profile-avatar">
          ${u.avatar ? `<img src="${esc(u.avatar)}" alt="Profile picture">` : icon("user")}
        </div>
        <label class="profile-badge-upload" title="Upload photo" style="position:absolute; bottom:0; right:0; background:var(--navy); color:#fff; border-radius:50%; width:28px; height:28px; display:grid; place-items:center; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.2);">
          +
          <input type="file" id="profilePhotoInput" accept="image/*" hidden>
        </label>
      </div>
    `;

    h = `<div class="panel">
      
<div class="profile-header" style="align-items:center; gap:16px;">
  ${photoSection}
  <div>
    <h3 style="margin-bottom:4px">${esc(u.name || u.email)}</h3>
    <p class="muted" style="margin:0">
      ${u.role.replace("_", " ")}
      ${u.ucid ? ` · Unique Customer ID: <b>${u.ucid}</b>` : ""}
    </p>
    ${u.role !== "admin" && u.avatar ? `
      <div class="profile-photo-actions" style="margin-top:8px;">
        <button type="button" class="link" data-act="removeAvatar" style="font-size:12px; color:#b3261e; background:none; border:none; cursor:pointer; padding:0;">Remove photo</button>
      </div>
    ` : ""}
  </div>
</div>

      <form data-form="profile" style="margin-top:20px;">
        ${field("Full name", `<input name="n" value="${esc(u.name)}">`)}
        ${field("Email address", `<input name="e" type="email" value="${esc(u.email)}">`)}
        ${u.role === "normal_user" ? field("Mobile number", `<input name="m" value="${esc(u.mobile)}">`) : ""}
        ${field("Current password (needed to change your email)", `<input name="cp" type="password">`)}
        <div class="err" id="er"></div>
        <button class="btn btn-primary">Save profile</button>
      </form>
    </div>
    <div class="panel" style="margin-top:18px">
      <h3>Change password</h3>
      <form data-form="pw">
        ${field("Current password", `<input name="o" type="password">`)}
        ${field("New password", `<input name="p" type="password">`)}
        ${field("Confirm new password", `<input name="c" type="password">`)}
        <div class="err" id="er2"></div>
        <button class="btn btn-ghost">Change password</button>
      </form>
    </div>`;
  } else if (tab === "saved" && u.role === "normal_user") {
    h = `<div class="panel">
      <h3>Saved food (${sv.length})</h3>
      ${
        sv.length
          ? `<div class="food-grid" style="grid-template-columns:repeat(auto-fill, minmax(220px, 1fr))">${sv.map(productCard).join("")}</div>`
          : `<p class="muted">Tap the heart on any food to save it.</p><button class="btn btn-soft btn-small" data-go="search">Explore food</button>`
      }
    </div>`;
  } else if (tab === "feedback" && u.role === "normal_user") {
    h = `<div class="panel">
      <h3>My feedback</h3>
      ${
        R.length
          ? R.map(
              (r) => `<div class="rev">
                <b>${esc(bz(r.bid)?.name || "(removed shop)")}</b> 
                <span class="stars">${icon("star")} ${r.score}</span> 
                <span class="status verified">${r.verified ? "Verified" : "Pending"}</span>
                <p>${esc(r.comment)}</p>
                <span class="muted">${fd(r.at)}</span> · <a class="link" href="#review/${r.bid}">Edit</a>
              </div>`,
            ).join("")
          : `<p class="muted">You have not reviewed a shop yet.</p><button class="btn btn-soft btn-small" data-go="review">Review a shop</button>`
      }
    </div>`;
  }

  const accountTypeTitle = 
    u.role === "admin" ? "Admin Account" :
    u.role === "business_owner" ? "Business Owner Account" : 
    "Customer Account";

  return `<section class="container dashboard">
    ${side("profile", T, tab)}
    <div class="dash-main">
      ${dashHead(accountTypeTitle, "My Account Dashboard", "Manage your profile details and settings.")}
      ${h}
    </div>
  </section>`;
}

/* ---------- dashboards ---------- */
const side = (base, items, tab) =>
  `<aside class="sidebar"><div class="brand"><span class="brand-mark"><img src="logo.jpg" alt=""></span><span>ClickBites</span></div>${items.map(([k, l, ic]) => `<a href="#${base}/${k}" class="${tab === k ? "active" : ""}">${icon(ic)} ${l}</a>`).join("")}<a href="#" class="out" data-act="logout">${icon("logout")} Log out</a></aside>`;
const stat = (l, v, s = "") =>
  `<div class="stat"><span>${l}</span><strong>${v}</strong><span>${s}</span></div>`;
const cstat = (c) =>
  c.usedAt
    ? "used"
    : c.voidedAt
      ? "voided"
      : c.expires < Date.now()
        ? "expired"
        : "unused";
const table = (head, rows, empty) =>
  `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${head.length}" class="muted">${empty}</td></tr>`}</tbody></table></div>`;
const dashHead = (eyebrow, title, sub, btn = "") =>
  `<div class="dash-header"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2><p class="muted" style="margin:0">${sub}</p></div>${btn}</div>`;
const codeForm = () =>
  `<div class="panel">
    <h3>Generate receipt code</h3>
    <p class="muted">One code per genuine customer transaction. Write it on the receipt or let the customer scan the QR code. Valid 24 hours, single use.</p>
    <form data-form="code">
      <button class="btn btn-primary">Generate code</button>
    </form>
    ${
      S.newCode
        ? `<div style="margin-top:18px; text-align:center; padding:16px; background:var(--cream); border:1px dashed var(--line); border-radius:12px;">
            <div class="codebig" style="margin-bottom:8px;">${S.newCode}</div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(S.newCode)}" 
                 alt="Receipt Code QR" 
                 style="margin:10px auto 0; display:block; border-radius:8px; border:4px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.08);" />
            <p class="muted" style="font-size:12px; margin:8px 0 0;">Scan this QR code with your camera or review form.</p>
           </div>`
        : ""
    }
  </div>`;
function ownerDash(tab = "dashboard") {
  const b = myShop(),
    T = [
      ["dashboard", "Dashboard", "chart"],
      ["shop", "My shop", "store"],
      ["products", "Products", "list"],
      ["codes", "Verification codes", "receipt"],
      ["reviews", "Reviews", "review"],
      ["settings", "Settings", "settings"],
    ];
  if (!b)
    return emptyBox(
      "store",
      "No shop linked",
      "Please contact the administrator.",
    );
  const P = DB.products.filter((p) => p.bid === b.id),
    C = DB.codes
      .filter((c) => c.bid === b.id)
      .sort((a, c) => c.created - a.created),
    R = DB.ratings.filter((r) => r.bid === b.id && r.verified);
  let h = "";
  if (tab === "dashboard")
    h = `<div class="stats">${stat("Average rating", avg(b.id).n ? avg(b.id).a.toFixed(1) + " ★" : "—", "Verified feedback only")}${stat("Verified reviews", R.length)}${stat("Products", P.length, P.filter((p) => p.active).length + " published")}${stat("Unused codes", C.filter((c) => cstat(c) === "unused").length)}</div><div class="grid-two">${codeForm()}<div class="panel"><h3>Recent products</h3>${table(
      ["Product", "Price", "Status"],
      P.slice(0, 5).map(
        (p) =>
          `<tr><td>${esc(p.name)}</td><td>${money(p.price)}</td><td><span class="status">${p.active ? "Published" : "Hidden"}</span></td></tr>`,
      ),
      "No products yet.",
    )}<button class="btn btn-soft btn-small" style="margin-top:12px" data-go="owner/products">Manage products</button></div></div>`;
  if (tab === "shop")
    h = `<div class="panel"><form data-form="shop">${[
      ["name", "Shop name"],
      ["address", "Address"],
      ["contact", "Contact"],
      ["hours", "Hours (display text)"],
      ["link", "Main page link (https://…)"],
    ]
      .map(([k, l]) => field(l, `<input name="${k}" value="${esc(b[k])}">`))
      .join(
        "",
      )}<div class="row">${field("Opens", `<input name="opens" type="time" value="${b.opens}">`)}${field("Closes", `<input name="closes" type="time" value="${b.closes}">`)}</div>${field("Description", `<textarea name="desc">${esc(b.desc)}</textarea>`)}${field("Cover image (compressed to WebP; leave empty to keep)", `<input name="i" type="file" accept="image/*">`)}<div class="err" id="er"></div><button class="btn btn-primary">Save shop</button></form></div>`;
  if (tab === "products") {
    const e = prod(S.edit);
    h = `<div class="panel"><h3>${e ? "Edit" : "Add"} product</h3><form data-form="product">${field("Product name", `<input name="n" value="${esc(e?.name)}">`)}${field("Description", `<textarea name="d">${esc(e?.desc)}</textarea>`)}<div class="row">${field("Price (₱)", `<input name="p" type="number" min="0" step="0.01" value="${e ? e.price : ""}">`)}${field("Category", `<select name="c">${DB.cats.map((c) => `<option value="${c.id}" ${e?.cat === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>`)}</div>${field("Photo (compressed to WebP)" + (e ? " – leave empty to keep current" : ""), `<input name="i" type="file" accept="image/*">`)}<div class="err" id="er"></div><button class="btn btn-primary">${e ? "Save product" : "Add product"}</button> ${e ? `<button type="button" class="btn btn-ghost" data-act="canceledit">Cancel</button>` : ""}</form></div><div class="panel" style="margin-top:18px">${table(
      ["Product", "Category", "Price", "Status", "Action"],
      P.map(
        (p) =>
          `<tr><td>${esc(p.name)}</td><td>${esc(cat(p.cat)?.name)}</td><td>${money(p.price)}</td><td><span class="status">${p.active ? "Published" : "Hidden"}</span></td><td><button class="btn btn-ghost btn-small" data-act="editp" data-id="${p.id}">Edit</button> <button class="btn btn-ghost btn-small" data-act="togp" data-id="${p.id}">${p.active ? "Hide" : "Show"}</button> <button class="btn btn-danger btn-small" data-act="delp" data-id="${p.id}">Delete</button></td></tr>`,
      ),
      "No products yet.",
    )}</div>`;
  }
  if (tab === "codes")
    h = `${codeForm()}<div class="panel" style="margin-top:18px">${table(
      ["Code", "Reference", "Status", "Created", "Expires", "Used", ""],
      C.map((c) => {
        const s = cstat(c);
        return `<tr><td><b>${c.code}</b></td><td>${esc(c.ref)}</td><td><span class="status ${s}">${s}</span></td><td>${fd(c.created)}</td><td>${fd(c.expires)}</td><td>${c.usedAt ? fd(c.usedAt) : "—"}</td><td>${s === "unused" ? `<button class="btn btn-danger btn-small" data-act="voidc" data-id="${c.id}">Void</button>` : ""}</td></tr>`;
      }),
      "No codes yet.",
    )}<p class="form-note">The customer's identity is never shown to the shop.</p></div>`;
  if (tab === "reviews")
    h = `<div class="panel"><h3>Verified feedback</h3><div>${rateHtml(b.id)}</div>${
      R.length
        ? R.sort((a, c) => c.at - a.at)
            .map(
              (r) =>
                `<div class="rev"><span class="stars">${icon("star")} ${r.score}</span> <span class="vp">${icon("shield")} Verified Purchase</span><p>${esc(r.comment)}</p><span class="muted">${fd(r.at)}</span></div>`,
            )
            .join("")
        : `<p class="muted">No verified feedback yet.</p>`
    }</div>`;
  if (tab === "settings")
    h = `<div class="panel"><h3>Account settings</h3><p class="muted">Change your name, email or password from your profile.</p><button class="btn btn-primary" data-go="profile">Open profile</button></div>`;
  return `<section class="container dashboard">${side("owner", T, tab)}<div class="dash-main">${dashHead("Business owner portal", esc(b.name), "Manage your listing and help customers find you.", `<button class="btn btn-primary" data-go="shop/${b.id}">View public shop</button>`)}${h}</div></section>`;
}

function adminDash(tab = "dashboard") {
  const T = [
    ["dashboard", "Dashboard", "chart"],
    ["shops", "Shops & owners", "store"],
    ["users", "Users", "users"],
    ["categories", "Categories", "tag"],
    ["reviews", "Reviews", "review"],
    ["settings", "Settings", "settings"],
  ];
  const shopRows = (acts) =>
    DB.businesses.map(
      (b) =>
        `<tr><td>${esc(b.name)}</td><td>${esc(DB.users.find((u) => u.id === b.owner)?.email)}</td><td>${esc(b.address)}</td><td>${rateHtml(b.id)}</td><td><button class="btn btn-ghost btn-small" data-go="shop/${b.id}">View</button>${acts ? ` <button class="btn btn-ghost btn-small" data-act="addr" data-id="${b.id}">Edit location</button> <button class="btn btn-danger btn-small" data-act="delb" data-id="${b.id}">Remove</button>` : ""}</td></tr>`,
    );
  const heads = ["Shop", "Owner", "Location", "Rating", "Action"];
  let h = "";
  if (tab === "dashboard")
    h = `<div class="stats">${stat("Users", DB.users.filter((u) => u.role === "normal_user").length, "Customers")}${stat("Local shops", DB.businesses.length)}${stat("Feedback entries", DB.ratings.length)}${stat("Categories", DB.cats.length)}</div><div class="panel"><div class="results-head"><h3>Local shop listings</h3><button class="btn btn-primary btn-small" data-go="admin/shops">+ Add owner account</button></div>${table(heads, shopRows(false), "No shops.")}</div>`;
  if (tab === "shops")
    h = `<div class="panel"><h3>Create business owner account</h3><form data-form="owner"><div class="row">${field("Owner name", `<input name="n">`)}${field("Owner email", `<input name="e" type="email">`)}${field("Initial password (min 8)", `<input name="p">`)}</div><div class="row">${field("Business name", `<input name="b">`)}${field("Business address / location", `<input name="a">`)}</div><div class="err" id="er"></div><button class="btn btn-primary">Create owner &amp; shop</button></form></div><div class="panel" style="margin-top:18px">${table(heads, shopRows(true), "No shops.")}</div>`;
  if (tab === "users")
    h = `<div class="panel">${table(
      ["User", "Role", "UCID", "Status", "Action"],
      DB.users
        .filter((u) => u.role !== "admin")
        .map(
          (u) =>
            `<tr><td>${esc(u.name || "—")}<br><span class="muted">${esc(u.email)}</span></td><td>${u.role.replace("_", " ")}</td><td>${u.ucid || "—"}</td><td><span class="status ${u.active ? "verified" : "suspended"}">${u.active ? "Active" : "Suspended"}</span></td><td><button class="btn btn-ghost btn-small" data-act="editu" data-id="${u.id}">Edit</button> <button class="btn ${u.active ? "btn-danger" : "btn-soft"} btn-small" data-act="togu" data-id="${u.id}">${u.active ? "Suspend" : "Reactivate"}</button></td></tr>`,
        ),
      "No users yet.",
    )}</div>`;
  if (tab === "categories")
    h = `<div class="panel"><h3>Category management</h3><form data-form="cat" class="row" style="align-items:end"><div class="field" style="margin:0"><label>New category name</label><input name="n" placeholder="e.g. Bakery"></div><button class="btn btn-soft" style="flex:0">Add</button></form></div><div class="panel" style="margin-top:18px">${table(
      ["Category", "Products", "Action"],
      DB.cats.map(
        (c) =>
          `<tr><td>${esc(c.name)}</td><td>${DB.products.filter((p) => p.cat === c.id).length}</td><td><button class="btn btn-ghost btn-small" data-act="renc" data-id="${c.id}">Rename</button> <button class="btn btn-danger btn-small" data-act="delc" data-id="${c.id}">Delete</button></td></tr>`,
      ),
      "No categories.",
    )}</div>`;
  if (tab === "reviews")
    h = `<div class="panel"><h3>Moderation</h3>${DB.ratings.length ? DB.ratings.map((r) => `<div class="rev"><b>${esc(bz(r.bid)?.name)}</b> <span class="stars">${icon("star")} ${r.score}</span> <span class="muted">${r.ucid}</span><p>${esc(r.comment)}</p><button class="btn btn-danger btn-small" data-act="delr" data-id="${r.id}">Remove</button></div>`).join("") : `<p class="muted">No feedback to moderate.</p>`}</div>`;
  if (tab === "settings")
    h = `<div class="panel"><h3>Account settings</h3><button class="btn btn-primary" data-go="profile">Open profile</button></div>`;
  return `<section class="container dashboard">${side("admin", T, tab)}<div class="dash-main">${dashHead("Administrator portal", "Platform overview", "Manage listings, accounts, categories, and content quality.", `<span class="pill">Administrator</span>`)}${h}</div></section>`;
}

function icon(name, extraClass = "") {
  const paths = {
    utensils:
      '<path d="M7 3v7M4.5 3v4.5A2.5 2.5 0 0 0 7 10a2.5 2.5 0 0 0 2.5-2.5V3M7 10v11M17 3c-2 2-3 4.2-3 7v2h3v9M17 3v9"/>',
    soup: '<path d="M4 11h16a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7ZM3 21h18M8 3v4M12 2v5M16 3v4"/>',
    sandwich:
      '<path d="M4 10a8 8 0 0 1 16 0v1H4v-1ZM4 14h16l-2 5H6l-2-5ZM7 11v3M12 11v3M17 11v3"/>',
    cup: '<path d="M5 4h12l-1 17H7L5 4ZM4 4h14M17 7h2a2 2 0 0 1 0 4h-2M9 2v2M13 2v2"/>',
    cake: '<path d="M4 12h16v8H4zM4 12c0-2 2-3 4-1 2-3 5-3 7 0 2-2 5-1 5 1M8 16v1M12 16v1M16 16v1M12 2v3M10 5h4"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
    heart:
      '<path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.4Z"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V10Z"/>',
    store:
      '<path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone:
      '<path d="M7 3H4a1 1 0 0 0-1 1c0 9 8 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 3a14 14 0 0 1-6-6l3-2-2-5Z"/>',
    shield:
      '<path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    chart: '<path d="M4 20V4M4 20h17M8 16v-4M13 16V7M18 16v-7"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19 13.5a7 7 0 0 0 0-3l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L13.5 2h-4L9 5.1a8 8 0 0 0-2.6 1.5L4 5.6 2 9l2 1.5a7 7 0 0 0 0 3L2 15l2 3.4 2.4-1A8 8 0 0 0 9 19.9l.5 3.1h4l.5-3.1a8 8 0 0 0 2.6-1.5l2.4 1 2-3.4Z"/>',
    users:
      '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/>',
    tag: '<path d="M20 13 13 20 3 10V3h7l10 10Z"/><circle cx="7.5" cy="7.5" r="1"/>',
    review:
      '<path d="M4 4h16v13H9l-5 4V4Z"/><path d="m12 7 1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4L12 7Z"/>',
    flag: '<path d="M5 21V4M5 4c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
    logout: '<path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    receipt:
      '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  };
  return `<svg class="icon-svg ${extraClass}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.utensils}</svg>`;
}

/* ---------- router & nav ---------- */
const redir = (p) => location.replace("#" + p);
function go(p) {
  if (location.hash.slice(1) === p) render();
  else location.hash = p;
}
// Replace the existing updNav function in script.js with this:
function updNav() {
  const u = cur(),
    el = $("#navActions");
  if (!el) return;

  const [page] = (location.hash.slice(1) || "home").split("/");

  // Hide topbar actions entirely when inside the admin or owner portals
  if (u && (page === "admin" || page === "owner")) {
    el.innerHTML = "";
    return;
  }

  // Replace top-right Log out with Dashboard when admin/owner views profile or shop page
  if (u && (page === "profile" || page === "shop") && u.role !== "normal_user") {
    el.innerHTML = `<button class="btn btn-primary" data-go="${dashPath(u)}">Dashboard</button>`;
    return;
  }

  el.innerHTML = u
    ? `<button class="btn btn-ghost" data-go="${dashPath(u)}">${u.role === "normal_user" ? "My Account" : "Dashboard"}</button><button class="btn btn-primary" data-act="logout">Log out</button>`
    : `<button class="btn btn-primary" data-go="login">Log in</button><button class="btn btn-ghost" data-go="signup">Sign up</button>`;
}
function render() {
  if (S.booting) {
    app.innerHTML = '<p class="muted" style="padding:80px 20px;text-align:center">Loading…</p>';
    return;
  }
  // In script.js, update the render() function's body class toggles:
  const [page0, arg] = (location.hash.slice(1) || "home").split("/");
  let page = page0;
  // Apply specific view classes to the body element
  const u = cur();
  document.body.classList.toggle("admin-view", page === "admin" || (page === "profile" && u?.role === "admin") || (page === "shop" && u?.role === "admin"));
  document.body.classList.toggle("owner-view", page === "owner" || (page === "profile" && u?.role === "business_owner") || (page === "shop" && u?.role === "business_owner"));
  document.body.classList.toggle("dashboard-view", page === "admin" || page === "owner" || page === "profile" || page === "review");

  const V = {
    home,
    search: searchPage,
    shops: shopsPage,
    shop: () => shopPage(arg),
    signup: () => auth("signup"),
    login: () => auth("login"),
    otp: () => auth("otp"),
    forgot: () => auth("forgot"),
    reset: () => auth("reset", arg),
    profile: () => profilePage(arg),
    review: () => reviewPage(arg),
    owner: () => ownerDash(arg),
    admin: () => adminDash(arg),
    "reset-sms": () => auth("reset-sms"),
  };
  
  if (!V[page]) page = "home";
  if (["profile", "owner", "admin"].includes(page) && !u) {
    toast(
      S.expired
        ? "Session expired. Please log in again."
        : "Please log in first.",
      "er",
    );
    S.expired = false;
    return redir("login");
  }
  if (
    (page === "owner" && u?.role !== "business_owner") ||
    (page === "admin" && u?.role !== "admin")
  ) {
    toast("That page is not available for your role.", "er");
    return redir(dashPath(u));
  }
  if (["login", "signup", "forgot"].includes(page) && u)
    return redir(dashPath(u));
  touch();
  updNav();
  try {
    app.innerHTML = V[page]();
  } catch (e) {
    console.error(e);
    app.innerHTML = emptyBox(
      "flag",
      "Something went wrong",
      esc(e.message),
      `<button class="btn btn-primary" data-go="home">Back home</button>`,
    );
  }
  document
    .querySelectorAll("[data-page]")
    .forEach((a) => a.classList.toggle("active", a.dataset.page === page));
  $("#mainNav")?.classList.remove("open");
  window.scrollTo({ top: 0 });
}
window.addEventListener("hashchange", render);

/* ---------- actions ---------- */
const role = (r) => {
  const u = cur();
  if (!u || u.role !== r) {
    go("login");
    return null;
  }
  touch();
  return u;
};
const ACT = {
  

  
togglePassword: (id, button) => {
  const input = button.parentElement.querySelector("input");

  if (input.type === "password") {
    input.type = "text";
    button.textContent = "Hide";
    button.setAttribute("aria-label", "Hide password");
  } else {
    input.type = "password";
    button.textContent = "Show";
    button.setAttribute("aria-label", "Show password");
  }
},

  quickview(id) {
    openQuickView(id);
  },
  closeModal() {
    closeModal();
  },
  viewShopDetails(id) {
    closeModal();
    S.shopTab = "Overview";
    go("shop/" + id);
  },
  modalStar(id) {
    S.modalStars = +id;
    document.querySelectorAll("[data-act=modalStar]").forEach((btn) => {
      btn.style.color = +btn.dataset.id <= S.modalStars ? "#f59e0b" : "#cbd5e1";
    });
    const numEl = $("#modalStarNum");
    if (numEl) numEl.textContent = S.modalStars;
  },
  

  cat(id) {
    F.cat = id;
    F.n = 8;
    go("search");
  },
  more() {
    F.n += 8;
    render();
  },
  clear() {
    F = {
      ...F,
      cat: "All",
      price: "all",
      rate: "0",
      open: "",
      time: "",
      q: "",
      n: 8,
    };
    render();
  },
  unchip(id) {
    if (id === "cat") F.cat = "All";
    if (id === "price") F.price = "all";
    if (id === "rate") F.rate = "0";
    if (id === "open") {
      F.open = "";
      F.time = "";
    }
    if (id === "q") F.q = "";
    render();
  },
  visit(id) {
    const b = bz(id);
    if (!b?.link) return toast("This shop has not added a main page link yet.");
    window.open(b.link, "_blank", "noopener,noreferrer");
  },
  stab(id) {
    S.shopTab = id;
    render();
  },
  star(id) {
    S.stars = +id;
    document
      .querySelectorAll("[data-act=star]")
      .forEach((b) => b.classList.toggle("active", +b.dataset.id <= S.stars));
  },
  editp(id) {
    if (!role("business_owner")) return;
    S.edit = id;
    render();
    window.scrollTo({ top: 0 });
  },
  canceledit() {
    S.edit = null;
    render();
  },
};

const FORMS = {
  search(f) {
    F.q = f.q.value.trim();
    F.n = 8;
    go("search");
  },
  searchShops(f) {
    F.q = f.q.value.trim();
    go("shops");
  },
};

document.addEventListener("click", (e) => {
  if (e.target.closest("#mobileMenu"))
    return $("#mainNav").classList.toggle("open");
  
  if (e.target.matches("#quickViewModal")) {
    closeModal();
    return;
  }

  const a = e.target.closest("[data-act]");
  if (a && ACT[a.dataset.act]) {
    e.preventDefault();
    e.stopPropagation();
    return ACT[a.dataset.act](a.dataset.id, a);
  }
  const g = e.target.closest("[data-go]");
  if (g) {
    e.preventDefault();
    closeModal();
    go(g.dataset.go);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

document.addEventListener("submit", (e) => {
  const fn = FORMS[e.target.dataset.form];
  if (fn) {
    e.preventDefault();
    fn(e.target);
  }
});

document.addEventListener("change", (e) => {
  const t = e.target;
  
  if (t.id === "profilePhotoInput") {
    const file = t.files?.[0];
    const u = cur();
    if (!file || !u) return;
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file.", "er");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Choose an image smaller than 5 MB.", "er");
      t.value = "";
      return;
    }
    webp(file)
      .then(async (imageData) => {
        try {
          const url = await uploadImg("avatars", u.id + "/avatar", imageData);
          const r = await sb.from("profiles").update({ avatar_url: url }).eq("id", u.id);
          if (r.error) throw r.error;
          await reload();
          render();
          toast("Profile picture updated.");
        } catch (x) {
          toast(friendly(x), "er");
        }
      })
      .catch(() => toast("Could not load that image. Try another.", "er"));
    return;
  }

  if (t.name === "category") {
    F.cat = t.value;
    F.n = 8;
    render();
  } else if (t.dataset.f) {
    F[t.dataset.f] = t.value;
    if (t.dataset.f === "open" && t.value !== "at") F.time = "";
    F.n = 8;
    render();
  } else if (t.dataset.act === "pickshop") go("review/" + t.value);
});

/* ---------- Supabase-backed actions (override the simple versions above) ---------- */
const need = (r, m) => {
  if (r.error) {
    toast(m || friendly(r.error), "er");
    return false;
  }
  return true;
};
const sbErrBody = async (error) => {
  try {
    return (await error.context.json()).error || error.message;
  } catch (e) {
    return error.message;
  }
};
Object.assign(ACT, {
  async removeAvatar() {
    const u = cur();
    if (!u) return;
    if (!need(await sb.from("profiles").update({ avatar_url: null }).eq("id", u.id))) return;
    await reload();
    render();
    toast("Profile picture removed.");
  },
  async save(id) {
    const y = window.scrollY,
      u = cur(),
      k = u?.id || "guest",
      s = new Set(DB.saved[k] || []),
      had = s.has(id);
    if (u) {
      const r = had
        ? await sb.from("favorites").delete().eq("user_id", u.id).eq("product_id", Number(id))
        : await sb.from("favorites").insert({ user_id: u.id, product_id: Number(id) });
      if (!need(r)) return;
    }
    had ? s.delete(id) : s.add(id);
    DB.saved[k] = [...s];
    if (!u) {
      try {
        localStorage.setItem(GUEST_KEY, JSON.stringify(DB.saved.guest));
      } catch (e) {}
    }
    toast(had ? "Removed from saved items." : "Saved to your favorites.");
    render();
    requestAnimationFrame(() => window.scrollTo(0, y));
  },
  async resend() {
    const o = S.otp;
    if (!o) return;
    const wait = 6e4 - (Date.now() - (o.sent || 0));
    if (wait > 0) return err(`Please wait ${Math.ceil(wait / 1e3)}s before requesting a new code.`);
    const { error } = await sb.auth.resend({ type: "signup", email: o.email });
    if (error) return err(friendly(error));
    o.sent = Date.now();
    toast("A new code was sent to your email.");
  },
  async resendReset() {
    const r = S.reset;
    if (!r) return err("Please start again from Forgot password.");
    const wait = 6e4 - (Date.now() - (r.sent || 0));
    if (wait > 0) return err(`Please wait ${Math.ceil(wait / 1e3)}s before requesting a new code.`);
    await sb.auth.resetPasswordForEmail(r.email);
    r.sent = Date.now();
    toast("If that email is registered, a new code was sent.");
  },
  async logout() {
    await sb.auth.signOut();
    DB.me = null;
    await reload();
    toast("You have been logged out.");
    go("home");
  },
  async togp(id) {
    if (!role("business_owner")) return;
    const p = prod(id);
    if (p?.bid !== myShop()?.id) return;
    if (!need(await sb.from("products").update({ available: !p.active }).eq("id", Number(id)))) return;
    await reload();
    render();
  },
  async delp(id) {
    if (!role("business_owner")) return;
    const p = prod(id);
    if (p?.bid === myShop()?.id && confirm("Delete this product?")) {
      if (!need(await sb.from("products").delete().eq("id", Number(id)))) return;
      await reload();
      render();
    }
  },
  async voidc(id) {
    if (!role("business_owner")) return;
    const c = DB.codes.find((x) => x.id === id);
    if (c?.bid === myShop()?.id && cstat(c) === "unused") {
      if (!need(await sb.rpc("void_receipt_code", { p_code_id: Number(id) }))) return;
      S.newCode = null;
      await reload();
      render();
    }
  },
  async addr(id) {
    if (!role("admin")) return;
    const b = bz(id),
      a = prompt("Business address / location", b.address);
    if (a !== null) {
      if (!need(await sb.from("shops").update({ address: a.trim() }).eq("id", Number(id)))) return;
      await reload();
      render();
    }
  },
  async delb(id) {
    if (!role("admin") || !confirm("Remove this listing with its products, codes and feedback?")) return;
    if (!need(await sb.from("shops").delete().eq("id", Number(id)))) return;
    await reload();
    render();
  },
  async editu(id) {
    if (!role("admin")) return;
    const u = DB.users.find((x) => x.id === id),
      n = prompt("Full name", u.name);
    if (n !== null && n.trim()) {
      if (!need(await sb.from("profiles").update({ name: n.trim() }).eq("id", id))) return;
      await reload();
      render();
    }
  },
  async togu(id) {
    if (!role("admin")) return;
    const u = DB.users.find((x) => x.id === id);
    if (!need(await sb.rpc("admin_set_user_active", { p_user_id: id, p_active: !u.active }))) return;
    await reload();
    render();
  },
  async renc(id) {
    if (!role("admin")) return;
    const c = cat(id),
      n = prompt("Rename category", c.name);
    if (n?.trim()) {
      if (!need(await sb.from("categories").update({ name: n.trim() }).eq("id", Number(id)))) return;
      await reload();
      render();
    }
  },
  async delc(id) {
    if (!role("admin")) return;
    const n = DB.products.filter((p) => p.cat === id).length;
    if (n) return err(`Cannot delete: ${n} product(s) (active or inactive) still use this category.`);
    if (!need(await sb.from("categories").delete().eq("id", Number(id)))) return;
    await reload();
    render();
  },
  async delr(id) {
    if (!role("admin")) return;
    if (!need(await sb.from("reviews").delete().eq("id", Number(id)))) return;
    await reload();
    render();
  },
});

Object.assign(FORMS, {
  async reviewModal(f) {
    const bid = f.dataset.bid,
      vc = f.vc.value.trim().toUpperCase().replace(/\s/g, ""),
      cm = f.cm.value.trim(),
      u = cur(),
      erEl = $("#modalEr"),
      E = (m) => {
        if (erEl) erEl.textContent = m;
      };
    if (!u) return E("Please log in to submit a review.");
    if (u.role !== "normal_user") return E("Only customer accounts can submit feedback.");
    if (!vc) return E("Please enter your receipt code.");
    const { data, error } = await sb.rpc("submit_review", {
      p_shop_id: Number(bid),
      p_code: vc,
      p_score: S.modalStars || 5,
      p_comment: cm,
    });
    if (error) return E(friendly(error));
    if (!data?.ok) return E(data?.error || "Could not save your review.");
    await reload();
    toast("Verified review submitted!");
    openQuickView(DB.products.find((p) => p.bid === bid)?.id);
  },
  async signup(f) {
    const E = (m) => ($("#er").textContent = m),
      e = f.e.value.trim().toLowerCase(),
      p = f.p.value,
      name = f.name.value.trim(),
      m = f.m.value.replace(/[\s-]/g, "");
    if (!e || !p) return E("Enter your email and password.");
    if (!name && !m && !f.c.value) {
      const msg = await login(e, p); /* shop owners and admins use this same page to log in */
      return msg && E(msg);
    }
    if (!name) return E("Please enter your full name.");
    if (!validMob(m)) return E("Enter a valid PH mobile number (09XXXXXXXXX).");
    const v = validPw(p, f.c.value);
    if (v) return E(v);
    if (!f.t.checked) return E("Please accept the Terms and Privacy Policy.");
    const { data, error } = await sb.auth.signUp({ email: e, password: p, options: { data: { name, phone: m } } });
    if (error)
      return E(
        /already|registered/i.test(error.message)
          ? "This email is already registered. Please log in."
          : /rate|seconds|limit/i.test(error.message)
            ? "Too many emails were requested. Please wait a few minutes and try again."
            : friendly(error),
      );
    if (data.user && data.user.identities && data.user.identities.length === 0)
      return E("This email is already registered. Please log in.");
    if (data.session) {
      await reload();
      const u = cur();
      toast("Account created. Your Unique Customer ID is " + (u?.ucid || ""));
      return go(u ? dashPath(u) : "login");
    }
    S.otp = { purpose: "signup", email: e, sent: Date.now() };
    go("otp");
  },
  async login(f) {
    const m = await login(f.e.value.trim().toLowerCase(), f.p.value);
    if (m) $("#er").textContent = m;
  },
  async otp(f) {
    const o = S.otp,
      E = (m) => ($("#er").textContent = m);
    if (!o) return;
    const token = f.o.value.trim().replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(token)) return E("Enter the code from your email.");
    const { error } = await sb.auth.verifyOtp({ email: o.email, token, type: "signup" });
    if (error) return E("That code is wrong or has expired. Tap Resend code to get a new one.");
    S.otp = null;
    await reload();
    const u = cur();
    if (!u) return go("login");
    toast("Account created. Your Unique Customer ID is " + u.ucid);
    go(dashPath(u));
  },
  async forgot(f) {
    const E = (m) => ($("#er").textContent = m),
      e = f.e.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return E("Enter a valid email address.");
    const { error } = await sb.auth.resetPasswordForEmail(e);
    if (error && /rate|seconds|limit/i.test(error.message))
      return E("Please wait a minute before requesting another code.");
    S.reset = { email: e, sent: Date.now() };
    toast("If that email is registered, a reset code has been sent.");
    go("reset-sms");
  },
  async "reset-sms"(f) {
    const E = (m) => ($("#er").textContent = m),
      v = validPw(f.p.value, f.c.value);
    if (!S.reset) return E("Please start again from Forgot password.");
    if (v) return E(v);
    const token = f.o.value.trim().replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(token)) return E("Enter the code from your email.");
    const r = await sb.auth.verifyOtp({ email: S.reset.email, token, type: "recovery" });
    if (r.error) return E("That code is wrong or has expired. Request a new one.");
    const u = await sb.auth.updateUser({ password: f.p.value });
    await sb.auth.signOut();
    DB.me = null;
    if (u.error) return E(friendly(u.error));
    S.reset = null;
    toast("Password updated successfully. Please log in.");
    go("login");
  },
  async profile(f) {
    const u = cur(),
      E = (m) => ($("#er").textContent = m),
      e = f.e.value.trim().toLowerCase(),
      name = f.n.value.trim(),
      cust = u.role === "normal_user",
      m = cust ? f.m.value.replace(/[\s-]/g, "") : "";
    if (!name) return E("Enter your name.");
    if (cust && m && !validMob(m)) return E("Enter a valid PH mobile number.");
    const emailChg = e !== u.email;
    if (emailChg) {
      if (!f.cp.value) return E("Enter your current password to change your email.");
      const t = await sb.auth.signInWithPassword({ email: u.email, password: f.cp.value });
      if (t.error) return E("Current password is incorrect.");
    }
    const upd = { name };
    if (cust) upd.phone = m || null;
    const r = await sb.from("profiles").update(upd).eq("id", u.id);
    if (r.error) return E(friendly(r.error));
    if (emailChg) {
      const t = await sb.auth.updateUser({ email: e });
      if (t.error) return E(friendly(t.error));
      toast("Profile saved. Check your new email to confirm the change.");
    } else toast("Profile saved.");
    await reload();
    render();
  },
  async pw(f) {
    const u = cur(),
      E = (m) => ($("#er2").textContent = m),
      v = validPw(f.p.value, f.c.value);
    if (v) return E(v);
    const t = await sb.auth.signInWithPassword({ email: u.email, password: f.o.value });
    if (t.error) return E("Current password is incorrect.");
    const r = await sb.auth.updateUser({ password: f.p.value });
    if (r.error) return E(friendly(r.error));
    toast("Password changed.");
    f.reset();
  },
  review: submitReview,
  async shop(f) {
    if (!role("business_owner")) return;
    const b = myShop(),
      E = (m) => ($("#er").textContent = m),
      v = (k) => f[k].value.trim();
    if (!v("name")) return E("Shop name is required.");
    if (v("link") && !/^https?:\/\//i.test(v("link")))
      return E("The link must start with http:// or https://");
    const upd = {
      name: v("name"),
      address: v("address"),
      contact: v("contact"),
      hours_text: v("hours"),
      website_url: v("link"),
      opens_at: v("opens") || null,
      closes_at: v("closes") || null,
      description: v("desc"),
    };
    try {
      if (f.i.files[0]) upd.image_url = await uploadImg("shop-images", b.id + "/cover", await webp(f.i.files[0]));
    } catch (x) {
      return E("That image could not be uploaded.");
    }
    const r = await sb.from("shops").update(upd).eq("id", Number(b.id));
    if (r.error) return E(friendly(r.error));
    await reload();
    toast("Shop saved.");
    render();
  },
  async product(f) {
    if (!role("business_owner")) return;
    const b = myShop(),
      E = (m) => ($("#er").textContent = m),
      e = prod(S.edit),
      file = f.i.files[0];
    if (!f.n.value.trim() || !f.d.value.trim()) return E("Enter a name and a description.");
    if (f.p.value === "" || +f.p.value < 0) return E("Enter a valid price.");
    if (!e && !file) return E("Please add a product photo.");
    let img = e ? e.img : "";
    try {
      if (file) img = await uploadImg("product-images", b.id + "/p-" + Date.now(), await webp(file));
    } catch (x) {
      return E("That image could not be uploaded.");
    }
    const d = {
      name: f.n.value.trim(),
      description: f.d.value.trim(),
      price: +f.p.value,
      category_id: Number(f.c.value),
      image_url: img || null,
    };
    const r =
      e && e.bid === b.id
        ? await sb.from("products").update(d).eq("id", Number(e.id))
        : await sb.from("products").insert({ ...d, shop_id: Number(b.id), available: true });
    if (r.error) return E(friendly(r.error));
    S.edit = null;
    await reload();
    toast("Product saved. It now appears in the public menu.");
    render();
  },
  async code() {
    const u = role("business_owner"),
      b = myShop();
    if (!u || !b) return;
    const { data, error } = await sb.rpc("generate_receipt_code", { p_shop_id: Number(b.id), p_reference: "" });
    if (error) return err(friendly(error));
    S.newCode = data.code;
    await reload();
    render();
  },
  async owner(f) {
    if (!role("admin")) return;
    const E = (m) => ($("#er").textContent = m),
      e = f.e.value.trim().toLowerCase();
    if (!f.n.value.trim() || !e || !f.b.value.trim())
      return E("Owner name, email and business name are required.");
    if (f.p.value.length < 8 || !/[a-zA-Z]/.test(f.p.value) || !/[0-9]/.test(f.p.value))
      return E("Initial password needs 8+ characters with a letter and a number.");
    const ins = await sb
      .from("shops")
      .insert({ name: f.b.value.trim(), address: f.a.value.trim(), category: "Local Food" })
      .select("id")
      .single();
    if (ins.error) return E(friendly(ins.error));
    const r = await sb.functions.invoke("create-owner", {
      body: { email: e, password: f.p.value, name: f.n.value.trim(), shop_id: ins.data.id },
    });
    if (r.error) {
      await sb.from("shops").delete().eq("id", ins.data.id);
      return E(await sbErrBody(r.error));
    }
    await reload();
    toast("Owner account and shop created.");
    render();
  },
  async cat(f) {
    if (!role("admin")) return;
    const n = f.n.value.trim();
    if (!n) return;
    if (DB.cats.some((c) => c.name.toLowerCase() === n.toLowerCase()))
      return err("That category already exists.");
    if (!need(await sb.from("categories").insert({ name: n }))) return;
    await reload();
    render();
  },
});

/* Browser-side idle logout (15 minutes) for shop owners and admins */
setInterval(() => {
  if (DB.me && DB.me.role !== "normal_user" && Date.now() - S.last > IDLE) {
    S.expired = true;
    DB.me = null;
    sb.auth.signOut();
    render();
  }
}, 30000);
sb.auth.onAuthStateChange((ev) => {
  if (ev === "SIGNED_OUT" && !S.booting && DB.me)
    setTimeout(async () => {
      await reload();
      render();
    }, 0);
});

async function init() {
  render();
  await reload();
  S.booting = false;
  S.load = false;
  render();
}
init();
