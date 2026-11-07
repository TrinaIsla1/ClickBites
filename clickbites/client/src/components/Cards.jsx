import Icon from "./Icon";
import { Photo, Rate } from "./ui";
import { useApp } from "../context/AppContext";
import { fd, isOpen, money, nowT } from "../lib/utils";

export function ProductCard({ p }) {
  const { bz, cat, savedSet, toggleSave, setQuickViewId } = useApp();
  const b = bz(p.bid),
    sv = savedSet().has(p.id),
    openNow = b ? isOpen(b, nowT()) : false,
    open = () => setQuickViewId(p.id);

  return (
    <article
      className="food-card"
      tabIndex={0}
      aria-label={`View ${p.name}`}
      onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && open()}
    >
      <div className="food-photo" onClick={open}>
        <Photo src={p.img} alt={p.name} />
        <span className="tag">{cat(p.cat)?.name}</span>
        <span className={`status-badge ${openNow ? "open" : "closed"}`}>{openNow ? "OPEN" : "CLOSED"}</span>
        <button
          className={`heart ${sv ? "saved" : ""}`}
          aria-label={`Save ${p.name}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleSave(p.id);
          }}
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="food-info">
        <div className="food-meta">
          <span>{b ? b.name : ""}</span>
          <span>
            <Rate bid={p.bid} />
          </span>
        </div>
        <h3 onClick={open} style={{ cursor: "pointer" }}>
          {p.name}
        </h3>
        <p className="food-desc">{p.desc}</p>
        <div className="food-footer">
          <span className="price">{money(p.price)}</span>
          <button className="view-link" onClick={open}>
            View Item
          </button>
        </div>
      </div>
    </article>
  );
}

export function ShopCard({ b }) {
  const { bImg, go } = useApp();
  const im = bImg(b),
    openNow = isOpen(b, nowT());
  return (
    <article
      className="shop-strip"
      tabIndex={0}
      aria-label={`View ${b.name}`}
      onClick={() => go("shop/" + b.id)}
      onKeyDown={(e) => e.key === "Enter" && go("shop/" + b.id)}
    >
      <div className="shop-photo">
        {im ? (
          <img
            className="shop-avatar"
            src={im}
            alt={`${b.name} logo`}
            loading="lazy"
            onError={(e) => (e.currentTarget.style.visibility = "hidden")}
          />
        ) : (
          <div className="shop-avatar ph">
            <Icon name="store" />
          </div>
        )}
        <span className={`status-badge ${openNow ? "open" : "closed"}`}>{openNow ? "OPEN" : "CLOSED"}</span>
      </div>
      <div className="grow">
        <div>
          <h3 style={{ margin: "0 0 4px" }}>{b.name}</h3>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            {b.hours || "Hours not set"}
          </div>
          <div>
            <Rate bid={b.id} />
          </div>
        </div>
        <div className="shop-strip-footer">
          <span className="view-link" style={{ width: "100%" }}>
            View shop
          </span>
        </div>
      </div>
    </article>
  );
}

export function ReviewCard({ r, adminInfo = false, shopName = "", removable = false, onRemove }) {
  const { reviewerOf } = useApp();
  const w = reviewerOf(r);
  return (
    <div className="rev">
      <div className="rev-head">
        {w.avatar ? (
          <img className="rev-avatar" src={w.avatar} alt={w.name} loading="lazy" />
        ) : (
          <span className="rev-avatar rev-avatar-ph" aria-hidden="true">
            <Icon name="user" />
          </span>
        )}
        <div className="rev-who">
          <strong className="rev-name">{w.name}</strong>
          <span className="muted rev-meta">
            {shopName ? shopName + " · " : ""}
            {adminInfo && r.ucid ? r.ucid + " · " : ""}
            {fd(r.at)}
          </span>
        </div>
        <span className="stars rev-score">
          <Icon name="star" /> {Number(r.score).toFixed(1)}
        </span>
      </div>
      <div className="rev-badges">
        <span className="vp">
          <Icon name="shield" /> Verified Purchase
        </span>
      </div>
      {r.comment ? <p className="rev-text">{r.comment}</p> : null}
      {removable ? (
        <button className="btn btn-danger btn-small" onClick={() => onRemove(r.id)}>
          Remove
        </button>
      ) : null}
    </div>
  );
}
