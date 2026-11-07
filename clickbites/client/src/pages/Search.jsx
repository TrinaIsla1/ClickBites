import Icon from "../components/Icon";
import SearchBox from "../components/SearchBox";
import { ProductCard } from "../components/Cards";
import { BackLink, Skeleton } from "../components/ui";
import { useApp } from "../context/AppContext";
import { isOpen, nowT } from "../lib/utils";

export function useBizOK() {
  const { F, avg } = useApp();
  return (b) => {
    if (F.rate !== "0") {
      const r = avg(b.id);
      if (!r.n || r.a < +F.rate) return false;
    }
    if (F.open === "now" && !isOpen(b, nowT())) return false;
    if (F.open === "at" && (!F.time || !isOpen(b, F.time))) return false;
    return true;
  };
}

export default function Search() {
  const { db, F, patchF, resetFilters, loading, bz, cat, avg } = useApp();
  const bizOK = useBizOK();

  const prodPass = (p) => {
    const b = bz(p.bid);
    if (!b || !p.active) return false;
    const q = F.foodQ.toLowerCase(),
      c = cat(p.cat)?.name;
    if (F.cat !== "All" && c !== F.cat) return false;
    if (F.price === "low" && p.price >= 100) return false;
    if (F.price === "mid" && (p.price < 100 || p.price > 150)) return false;
    if (F.price === "high" && p.price <= 150) return false;
    return bizOK(b) && (!q || `${p.name} ${b.name} ${c}`.toLowerCase().includes(q));
  };

  const L = db.products.filter(prodPass);
  if (F.sort === "price") L.sort((a, b) => a.price - b.price);
  if (F.sort === "rating") L.sort((a, b) => avg(b.bid).a - avg(a.bid).a);

  const isFiltered = F.foodQ !== "" || F.cat !== "All" || F.price !== "all" || F.rate !== "0" || F.open !== "";

  const chips = [];
  if (F.cat !== "All") chips.push(["cat", F.cat]);
  if (F.price !== "all") chips.push(["price", { low: "Under ₱100", mid: "₱100–₱150", high: "Above ₱150" }[F.price]]);
  if (F.rate !== "0") chips.push(["rate", F.rate + "★ and up"]);
  if (F.open) chips.push(["open", F.open === "now" ? "Open now" : "Open at " + (F.time || "…")]);
  if (F.foodQ) chips.push(["q", "“" + F.foodQ + "”"]);

  const unchip = (id) => {
    if (id === "cat") patchF({ cat: "All" });
    if (id === "price") patchF({ price: "all" });
    if (id === "rate") patchF({ rate: "0" });
    if (id === "open") patchF({ open: "", time: "" });
    if (id === "q") patchF({ foodQ: "" });
  };

  const onFilter = (key) => (e) => {
    const v = e.target.value;
    if (key === "cat") patchF({ cat: v, foodQ: "" });
    else patchF({ [key]: v, ...(key === "open" && v !== "at" ? { time: "" } : {}), n: 8 });
  };

  const getSuggestions = (val) =>
    db.products
      .filter((p) => p.active && p.name.toLowerCase().startsWith(val))
      .map((p) => ({
        key: p.id,
        label: p.name,
        onPick: () => patchF({ cat: "All", foodQ: p.name, n: 8 }),
      }));

  let results;
  if (loading) results = <Skeleton />;
  else if (L.length)
    results = (
      <>
        <div
          className="food-grid"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(clamp(200px, 22vw, 260px), 1fr))" }}
        >
          {L.slice(0, F.n).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
        {L.length > F.n ? (
          <p style={{ textAlign: "center", marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => patchF({ n: F.n + 8 })}>
              Load more
            </button>
          </p>
        ) : null}
      </>
    );
  else
    results = (
      <div className="empty">
        <div className="emoji">
          <Icon name="search" />
        </div>
        <h3>No food found</h3>
        <p className="muted">Try another keyword or clear one or more filters.</p>
        <div className="chips" style={{ justifyContent: "center" }}>
          {db.cats.slice(0, 4).map((c) => (
            <button key={c.id} onClick={() => patchF({ cat: c.name, foodQ: "", n: 8 })}>
              {c.name}
            </button>
          ))}
        </div>
        <button className="btn btn-soft" onClick={resetFilters}>
          Clear filters
        </button>
      </div>
    );

  return (
    <section className="section">
      <div className="container">
        {isFiltered ? <BackLink onClick={resetFilters} label="Back to all food" /> : null}

        <SearchBox
          value={F.foodQ}
          placeholder="Try burger, rice meals, or a food item..."
          ariaLabel="Search food"
          style={{ maxWidth: "none", marginBottom: 22 }}
          getSuggestions={getSuggestions}
          onSubmit={(q) => patchF({ foodQ: q, n: 8 })}
        />

        <aside className="panel filters-top-bar" style={{ marginBottom: 22 }}>
          <div className="results-head" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="tag" /> Filters
            </h3>
            <button className="link" onClick={resetFilters} style={{ fontSize: 13 }}>
              Clear all
            </button>
          </div>
          <div className="filter-grid">
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="fCat">Category</label>
              <select id="fCat" value={F.cat} onChange={onFilter("cat")}>
                <option value="All">All Categories</option>
                {db.cats.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="fPrice">Price range</label>
              <select id="fPrice" value={F.price} onChange={onFilter("price")}>
                <option value="all">Any price</option>
                <option value="low">Under ₱100</option>
                <option value="mid">₱100–₱150</option>
                <option value="high">Above ₱150</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="fRate">Minimum rating (verified)</label>
              <select id="fRate" value={F.rate} onChange={onFilter("rate")}>
                <option value="0">Any rating</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="fOpen">Operating hours</label>
              <select id="fOpen" value={F.open} onChange={onFilter("open")}>
                <option value="">Any time</option>
                <option value="now">Open now</option>
                <option value="at">Open at…</option>
              </select>
            </div>
            {F.open === "at" ? (
              <div className="field" style={{ margin: 0 }}>
                <label>Select Time</label>
                <input type="time" value={F.time} onChange={onFilter("time")} />
              </div>
            ) : null}
          </div>
        </aside>

        <div>
          <div className="results-head">
            <div>
              <strong>{L.length} results</strong>
              <div className="muted" style={{ fontSize: 12 }}>
                {F.foodQ ? `For “${F.foodQ}”` : "Local food in Calbayog City"}
              </div>
            </div>
            <select
              value={F.sort}
              onChange={onFilter("sort")}
              className="field"
              style={{ margin: 0, width: "auto", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 9, fontSize: 13 }}
            >
              <option value="relevance">Sort: Recommended</option>
              <option value="price">Price: low to high</option>
              <option value="rating">Highest rated</option>
            </select>
          </div>
          {chips.length ? (
            <div className="chips" style={{ marginBottom: 16 }}>
              {chips.map((c) => (
                <button key={c[0]} onClick={() => unchip(c[0])}>
                  {c[1]} ×
                </button>
              ))}
            </div>
          ) : null}
          {results}
        </div>
      </div>
    </section>
  );
}
