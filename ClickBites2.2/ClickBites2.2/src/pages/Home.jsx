import React, { useMemo, useState } from "react";
import { ArrowRight, Store } from "lucide-react";
import Header from "../components/Header";
import Filters from "../components/Filters";
import FoodCard from "../components/FoodCard";
import FoodModal from "../components/FoodModal";
import AuthModal from "../components/AuthModal";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { CATEGORIES, PRICE_FILTERS, RATING_FILTERS } from "../utils/constants";
import { filterProducts } from "../lib/filters";
import { api } from "../api";
import { storage } from "../utils/storage";

export default function Home({ auth }) {
  const { user, signIn, signOut } = auth;
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [price, setPrice] = useState("Any Price");
  const [rating, setRating] = useState("All Ratings");
  const [openOnly, setOpenOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [authRole, setAuthRole] = useState("customer");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  React.useEffect(() => {
    Promise.all([
      api.products(),
      user ? api.favorites() : Promise.resolve({ favorites: [] })
    ]).then(([p, f]) => {
      setProducts(p.products);
      setFavorites(f.favorites.map((x) => x.product_id));
    }).catch((err) => setError(err.message))
      .finally(() => setLoadingProducts(false));
  }, [user]);

  const filtered = useMemo(() => filterProducts(products, { query, category, price, rating, openOnly }), [products, query, category, price, rating, openOnly]);

  const openAuth = (mode, role = "customer") => {
    setAuthMode(mode); setAuthRole(role); setAuthError("");
  };

  const submitAuth = async (form) => {
    setAuthLoading(true); setAuthError("");
    try {
      const data = authMode === "login"
        ? await api.login({ email: form.email, password: form.password })
        : await api.register({ ...form, role: authRole });
      storage.saveSession(data);
      signIn(data);
      setAuthMode(null);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const toggleFavorite = async (id) => {
    if (!user) { openAuth("login"); return; }
    try {
      if (favorites.includes(id)) {
        await api.removeFavorite(id);
        setFavorites((old) => old.filter((x) => x !== id));
      } else {
        await api.addFavorite(id);
        setFavorites((old) => [...old, id]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#333]">
      <Header
        query={query}
        setQuery={setQuery}
        user={user}
        onLogin={() => openAuth("login")}
        onRegister={() => openAuth("register")}
        onLogout={signOut}
        onPartnerLogin={() => openAuth("login", "partner")}
      />

      <main className="mx-auto max-w-[1180px] px-4 pb-12 pt-3">
        <Filters category={category} setCategory={setCategory} price={price} setPrice={setPrice} rating={rating} setRating={setRating} openOnly={openOnly} setOpenOnly={setOpenOnly} categories={CATEGORIES} prices={PRICE_FILTERS} ratings={RATING_FILTERS} count={filtered.length}/>

        <section className="mb-5 flex min-h-[80px] items-center justify-between gap-5 rounded-[14px] bg-gradient-to-r from-[#ef7717] to-[#e59a16] px-5 py-4 text-white shadow-sm">
          <div>
            <h1 className="text-[18px] font-black tracking-tight">Discover Calbayog's Best Local Food</h1>
            <p className="mt-1 max-w-2xl text-[10px] opacity-90">Explore authentic dishes and favorite local food spots. Click any food card to view details, scan QR codes, or visit official pages.</p>
          </div>
          <span className="hidden whitespace-nowrap rounded-full bg-white/15 px-3 py-1.5 text-[9px] font-bold sm:block">● Promo Platform Only (No Direct Ordering)</span>
        </section>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</div>}

        <section className="mb-3 flex items-end justify-between">
          <div><h2 className="text-[15px] font-black">Popular Local Picks</h2><p className="mt-1 text-[9px] text-neutral-400">Support local food businesses in Calbayog City.</p></div>
          <button onClick={() => {setCategory("All Categories");setPrice("Any Price");setRating("All Ratings");setOpenOnly(false);setQuery("");}} className="flex items-center gap-1 text-[11px] font-extrabold text-orange-600">View all <ArrowRight size={15}/></button>
        </section>

        {loadingProducts ? <Loading/> : filtered.length === 0 ? (
          <EmptyState onClear={() => {setCategory("All Categories");setPrice("Any Price");setRating("All Ratings");setOpenOnly(false);setQuery("");}}/>
        ) : (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => <FoodCard key={product.id} product={product} liked={favorites.includes(product.id)} onFavorite={toggleFavorite} onOpen={setSelected}/>)}
          </section>
        )}

        <section className="mt-7 flex flex-wrap items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-100 text-orange-600"><Store size={23}/></div>
          <div><h3 className="text-sm font-black">Own a local food business?</h3><p className="text-[10px] text-neutral-500">Join ClickBites and let more people discover your products.</p></div>
          <button onClick={() => openAuth("register", "partner")} className="ml-auto flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2.5 text-[11px] font-extrabold text-white">Become a Partner <ArrowRight size={15}/></button>
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-white px-5 py-5 text-[10px] text-neutral-400">
        <div className="mx-auto flex max-w-[1140px] justify-between gap-3">
          <span><b className="text-neutral-700">ClickBites</b> • Discover local food in Calbayog City</span>
          <span>© 2026 ClickBites</span>
        </div>
      </footer>

      {selected && <FoodModal product={selected} liked={favorites.includes(selected.id)} onFavorite={toggleFavorite} onClose={() => setSelected(null)}/>}
      {authMode && <AuthModal mode={authMode} role={authRole} onClose={() => setAuthMode(null)} onSwitch={(m) => setAuthMode(m)} onSubmit={submitAuth} error={authError} loading={authLoading}/>}
    </div>
  );
}