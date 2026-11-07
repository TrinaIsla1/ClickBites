import { useParams } from "react-router-dom";
import Icon from "../components/Icon";
import { ProductCard, ReviewCard } from "../components/Cards";
import { EmptyBox, Rate } from "../components/ui";
import { useApp } from "../context/AppContext";

export default function Shop() {
  const { id } = useParams();
  const { db, user, bz, bImg, bBanner, shopTab: t, setShopTab, go, toast } = useApp();
  const b = bz(id);

  if (!b)
    return (
      <EmptyBox icon="store" title="Shop not found" text="This listing may have been removed.">
        <button className="btn btn-primary" onClick={() => go("home")}>
          Back home
        </button>
      </EmptyBox>
    );

  const P = db.products.filter((p) => p.bid === b.id && p.active),
    R = db.ratings.filter((r) => r.bid === b.id && r.verified).sort((a, c) => c.at - a.at),
    im = bImg(b),
    bn = bBanner(b);

  const isOwner = user && user.role === "business_owner";
  const isAdmin = user && user.role === "admin";
  const backTarget = isOwner ? "owner" : isAdmin ? "admin/shops" : "shops";
  const backLabel = isOwner ? "Back to dashboard" : isAdmin ? "Back to admin dashboard" : "Back to shops";

  const visit = () => {
    if (!b.link) return toast("This shop has not added a main page link yet.");
    window.open(b.link, "_blank", "noopener,noreferrer");
  };

  let body;
  if (t === "Reviews")
    body = (
      <div className="panel">
        <div className="results-head">
          <div>
            <h3 style={{ margin: 0 }}>Customer feedback</h3>
            <div>
              <Rate bid={b.id} />
            </div>
          </div>
          {!user || user.role === "normal_user" ? (
            <button className="btn btn-primary" onClick={() => go(`review/${b.id}`)}>
              Write a review
            </button>
          ) : null}
        </div>
        <div className="notice">Verified Purchase feedback is linked to a valid receipt code issued by this shop.</div>
        {R.length ? R.map((r) => <ReviewCard key={r.id} r={r} />) : <p className="muted">No verified feedback yet.</p>}
      </div>
    );
  else if (t === "About")
    body = (
      <div className="panel">
        <h3>About {b.name}</h3>
        <p>{b.desc}</p>
        <p>
          <Icon name="store" /> {b.address || "Address not set"}
          <br />
          <Icon name="phone" /> {b.contact || "—"}
          <br />
          <Icon name="clock" /> {b.hours || "—"}
        </p>
      </div>
    );
  else
    body = P.length ? (
      <div className="food-grid">
        {P.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    ) : (
      <EmptyBox icon="utensils" title="No products listed yet" text="This shop has not added its menu." />
    );

  return (
    <section className="section">
      <div className="container">
        <div className="shop-cover">
          <button type="button" className="back-link back-float" onClick={() => go(backTarget)} aria-label={backLabel} title={backLabel}>
            <Icon name="arrow-left" />
          </button>
          {bn ? (
            <img
              className="shop-cover-img"
              src={bn}
              alt={`${b.name} cover photo`}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : null}
          <div className="shop-cover-ph" aria-hidden="true">
            <Icon name="utensils" />
          </div>
        </div>
        <div className="shop-head">
          {im ? (
            <img
              className="shop-head-logo"
              src={im}
              alt={`${b.name} logo`}
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
          ) : (
            <div className="shop-head-logo ph" role="img" aria-label={b.name}>
              <Icon name="store" />
            </div>
          )}
          <div className="shop-head-text">
            <h2>{b.name}</h2>
            <div className="muted">
              <Rate bid={b.id} />
            </div>
          </div>
          <button className="btn btn-primary shop-head-btn" onClick={visit}>
            Visit main page <Icon name="store" />
          </button>
        </div>
        <div className="tabs shop-tabs" style={{ marginTop: 20 }}>
          {["Menu", "Reviews", "About"].map((x) => (
            <button key={x} className={t === x ? "active" : ""} onClick={() => setShopTab(x)}>
              {x}
            </button>
          ))}
        </div>
        {body}
      </div>
    </section>
  );
}
