import Icon from "../components/Icon";
import SearchBox from "../components/SearchBox";
import { PageTitle } from "../components/ui";
import { useApp } from "../context/AppContext";
import { catIcon } from "../lib/utils";

export default function Home() {
  const { user, db, F, patchF, go } = useApp();

  const getSuggestions = (val) => {
    const foods = db.products.filter((p) => p.active && p.name.toLowerCase().startsWith(val));
    const shops = db.businesses.filter(
      (b) => b.name.toLowerCase().startsWith(val) || (b.address && b.address.toLowerCase().includes(val))
    );
    return [
      ...foods.map((p) => ({
        key: "f" + p.id,
        label: <span>{p.name}</span>,
        onPick: () => {
          patchF({ cat: "All", foodQ: p.name, n: 8 });
          go("search");
        },
      })),
      ...shops.map((b) => ({
        key: "s" + b.id,
        style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 },
        label: (
          <>
            <strong style={{ fontSize: 13, color: "var(--navy)" }}>{b.name}</strong>
            <small className="muted" style={{ fontSize: 10 }}>
              📍 {b.address || "Calbayog City"}
            </small>
          </>
        ),
        onPick: () => go("shop/" + b.id),
      })),
    ];
  };

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-panel">
            <div className="hero-copy">
              {user ? (
                <div
                  className="eyebrow"
                  style={{ marginBottom: 6, fontWeight: 1000, color: "var(--navy)", fontSize: "clamp(15px, 1.3vw, 19px)" }}
                >
                  Hello, {user.name || user.email}! 👋
                </div>
              ) : null}
              <div className="eyebrow">Your city, your flavors</div>
              <h1>
                Discover local food in <span style={{ color: "var(--lavender)" }}>Calbayog City.</span>
              </h1>
              <p>
                Find neighborhood food spots, explore their menus, and support the people behind your favorite local
                flavors.
              </p>

              <SearchBox
                placeholder="Search shops or food..."
                ariaLabel="Search shops or food"
                getSuggestions={getSuggestions}
                onSubmit={(q) => {
                  if (!q) return;
                  patchF({ foodQ: q, n: 8 });
                  go("search");
                }}
              />

              <div className="hero-actions" style={{ marginTop: 15 }}>
                <button className="btn btn-primary" onClick={() => go("search")}>
                  Explore food
                </button>
                <button className="btn btn-ghost" onClick={() => go("shops")}>
                  Browse all shops
                </button>
              </div>
            </div>
            <div className="hero-image" role="img" aria-label="A delicious local meal"></div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <PageTitle
            eyebrow="Browse by craving"
            title="Popular categories"
            sub="A quick way to discover something you will love."
          />
          <div className="category-row">
            {[...db.cats.slice(0, 5), { name: "All" }].map((c) => (
              <button
                key={c.name}
                className={`category ${F.cat === c.name ? "selected" : ""}`}
                onClick={() => {
                  patchF({ cat: c.name, foodQ: "", n: 8 });
                  go("search");
                }}
              >
                <span className="emoji">
                  <Icon name={c.name === "All" ? "grid" : catIcon(c.name)} />
                </span>
                <strong>{c.name === "All" ? "All categories" : c.name}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
