import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Photo, Rate } from "./ui";
import { useApp } from "../context/AppContext";
import { friendly, money } from "../lib/utils";
import { sb } from "../lib/supabase";

export default function QuickViewModal() {
  const { db, user, quickViewId, setQuickViewId, prod, bz, cat, go, setShopTab, reviewerOf, reload, toast } = useApp();
  const [stars, setStars] = useState(5);
  const [vc, setVc] = useState("");
  const [cm, setCm] = useState("");
  const [er, setEr] = useState("");
  const [formKey, setFormKey] = useState(0);

  const p = quickViewId ? prod(quickViewId) : null;
  const b = p ? bz(p.bid) : null;
  const isOpen = !!(p && b);

  const close = () => setQuickViewId(null);

  /* Fresh form every time a product is opened */
  useEffect(() => {
    setStars(5);
    setVc("");
    setCm("");
    setEr("");
    setFormKey((k) => k + 1);
  }, [quickViewId]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const submit = async (e) => {
    e.preventDefault();
    const code = vc.trim().toUpperCase().replace(/\s/g, "");
    if (!user) return setEr("Please log in to submit a review.");
    if (user.role !== "normal_user") return setEr("Only customer accounts can submit feedback.");
    if (!code) return setEr("Please enter your receipt code.");
    const { data, error } = await sb.rpc("submit_review", {
      p_shop_id: Number(b.id),
      p_code: code,
      p_score: stars || 5,
      p_comment: cm.trim(),
    });
    if (error) return setEr(friendly(error));
    if (!data?.ok) return setEr(data?.error || "Could not save your review.");
    await reload();
    toast("Verified review submitted!");
    setStars(5);
    setVc("");
    setCm("");
    setEr("");
    setFormKey((k) => k + 1);
  };

  let body = null;
  if (isOpen) {
    const R = db.ratings.filter((r) => r.bid === b.id && r.verified).sort((a, c) => c.at - a.at);
    body = (
      <>
        <div className="modal-hero">
          <Photo src={p.img} alt={p.name} />
          <span className="tag">{cat(p.cat)?.name}</span>
        </div>
        <div className="modal-content">
          <div className="modal-header-row">
            <h2>{p.name}</h2>
            <span className="modal-price">{money(p.price)}</span>
          </div>
          <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
            {p.desc}
          </p>

          <div className="modal-shop-card">
            <h4>
              <Icon name="store" /> {b.name}
            </h4>
            <div className="modal-shop-info">
              <div>📍 {b.address || "Calbayog City"}</div>
              <div>📞 {b.contact || "N/A"}</div>
              <div>⏰ {b.hours || "Hours not set"}</div>
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="link"
                  style={{ fontSize: 12, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                  onClick={() => {
                    close();
                    setShopTab("Menu");
                    go("shop/" + b.id);
                  }}
                >
                  View Shop →
                </button>
              </div>
            </div>
          </div>

          <div
            className="modal-reviews-section"
            style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 12 }}
          >
            <div className="modal-reviews-head" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 13, color: "var(--navy)" }}>Verified Customer Reviews</strong>
              <span style={{ fontSize: 12 }} className="muted">
                <Rate bid={b.id} />
              </span>
              <span className="pill" style={{ marginLeft: "auto", fontSize: 10, background: "#e3f4e4", color: "#1b6b25" }}>
                In-Store Protected
              </span>
            </div>

            {user && user.role === "normal_user" ? (
              <form
                key={formKey}
                className="modal-review-form"
                style={{ marginTop: 10, marginBottom: 12 }}
                onSubmit={submit}
              >
                <details
                  className="modal-review-details"
                  style={{ background: "#fdf8f6", border: "1px solid #f2e2d0", borderRadius: 10, padding: 10 }}
                >
                  <summary
                    style={{
                      fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--navy)",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <span>▼ Write Verified Review</span>
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setStars(n);
                          }}
                          style={{
                            background: "none", border: "none", fontSize: 16, cursor: "pointer", padding: "0 1px",
                            color: n <= stars ? "#f59e0b" : "#cbd5e1",
                          }}
                        >
                          ★
                        </button>
                      ))}{" "}
                      ({stars}/5)
                    </span>
                  </summary>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 8 }}>
                    <input
                      value={vc}
                      onChange={(e) => setVc(e.target.value)}
                      maxLength={12}
                      placeholder="Enter In-Store Receipt Code"
                      style={{ flex: 1, padding: "7px 10px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 8 }}
                      required
                    />
                    <span className="pill" style={{ fontSize: 10, alignSelf: "center" }}>
                      Required
                    </span>
                  </div>
                  <textarea
                    value={cm}
                    onChange={(e) => setCm(e.target.value)}
                    placeholder="How was your actual dining experience?"
                    style={{
                      width: "100%", height: 55, fontSize: 12, padding: 8, border: "1px solid var(--line)",
                      borderRadius: 8, resize: "none", marginBottom: 8,
                    }}
                  />
                  <div className="err" style={{ fontSize: 11, marginBottom: 6 }}>
                    {er}
                  </div>
                  <button className="btn btn-primary btn-small" style={{ width: "100%", borderRadius: 8 }}>
                    Submit Verified Review
                  </button>
                </details>
              </form>
            ) : (
              <div
                style={{
                  background: "#fdf8f6", border: "1px solid #f2e2d0", borderRadius: 10, padding: 10,
                  marginTop: 10, marginBottom: 12, textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: 11, color: "var(--navy)", fontWeight: 600, lineHeight: 1.5 }}>
                  Want to submit a verified review? Please log in to your account.{" "}
                  <button
                    className="btn btn-primary btn-small"
                    style={{
                      borderRadius: 6, fontSize: 10, padding: "2px 8px", marginLeft: 4,
                      display: "inline-flex", verticalAlign: "baseline",
                    }}
                    onClick={() => {
                      close();
                      go("login");
                    }}
                  >
                    Log in
                  </button>
                </p>
              </div>
            )}

            <div className="modal-review-list" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {R.length ? (
                R.map((r) => {
                  const w = reviewerOf(r);
                  const displayName = w.name !== "Verified Customer" ? w.name : r.ucid || "Verified Customer";
                  return (
                    <div
                      key={r.id}
                      className="modal-rev-item"
                      style={{ background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 8, padding: "8px 10px" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                          {w.avatar ? (
                            <img
                              src={w.avatar}
                              alt={displayName}
                              style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 24, height: 24, borderRadius: "50%", background: "var(--lavender-pale)",
                                display: "grid", placeItems: "center", fontSize: 11,
                              }}
                            >
                              <Icon name="user" />
                            </div>
                          )}
                          <span>
                            {displayName}{" "}
                            <span className="vp" style={{ fontSize: 9, padding: "1px 5px" }}>
                              Verified Customer
                            </span>
                          </span>
                        </span>
                        <span className="stars" style={{ fontSize: 12 }}>
                          ★ {Number(r.score).toFixed(1)}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 2px", fontSize: 11, color: "#4b5563" }}>
                        {r.comment || "No comment provided."}
                      </p>
                      <span className="muted" style={{ fontSize: 10 }}>
                        {new Date(r.at).toISOString().split("T")[0]}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="muted" style={{ fontSize: 11, textAlign: "center", padding: "8px 0" }}>
                  No verified reviews yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      className={`modal-overlay${isOpen ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="modal-card">
        <button className="modal-close" onClick={close} aria-label="Close details">
          &times;
        </button>
        <div className="modal-body">{body}</div>
      </div>
    </div>
  );
}
