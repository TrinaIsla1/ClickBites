import { useState } from "react";
import { useParams } from "react-router-dom";
import { BackLink, EmptyBox, Field, PageTitle } from "../components/ui";
import { useApp } from "../context/AppContext";
import { friendly } from "../lib/utils";
import { sb } from "../lib/supabase";

export default function Review() {
  const { id } = useParams();
  const { db, bz, go } = useApp();
  const b = bz(id) || db.businesses[0];
  if (!b)
    return (
      <EmptyBox icon="store" title="Shop not found" text="There are no shops to review yet.">
        <button className="btn btn-primary" onClick={() => go("home")}>
          Back home
        </button>
      </EmptyBox>
    );
  return <ReviewForm key={b.id} b={b} />;
}

function ReviewForm({ b }) {
  const { db, user, go, toast, reload, setShopTab } = useApp();
  const ex = user && db.ratings.find((r) => r.uid === user.id && r.bid === b.id);
  const [stars, setStars] = useState(ex ? ex.score : 0);
  const [er, setEr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    if (!user) {
      go("login");
      return toast("Please log in to review a shop.", "er");
    }
    if (user.role !== "normal_user") return setEr("Only customer accounts can submit feedback.");
    const bid = f.elements.b.value,
      comment = f.elements.cm.value.trim(),
      exist = db.ratings.find((r) => r.uid === user.id && r.bid === bid);
    if (!stars) return setEr("Please choose a star rating.");
    let res;
    if (exist) {
      res = await sb.rpc("edit_review", { p_shop_id: Number(bid), p_score: stars, p_comment: comment });
    } else {
      const raw = (f.elements.vc?.value || "").trim().toUpperCase().replace(/\s/g, "");
      if (!raw) return setEr("Please enter the code from your receipt.");
      res = await sb.rpc("submit_review", { p_shop_id: Number(bid), p_code: raw, p_score: stars, p_comment: comment });
    }
    if (res.error) return setEr(friendly(res.error));
    if (!res.data?.ok) return setEr(res.data?.error || "Could not save your review.");
    await reload();
    toast(exist ? "Your review was updated." : "Verified feedback saved. Thank you!");
    setShopTab("Reviews");
    go("shop/" + bid);
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 850 }}>
        <BackLink onClick={() => go(`shop/${b.id}`)} label="Back to shop" />
        <PageTitle
          eyebrow="Share your experience"
          title={ex ? "Edit your review" : "Review a local shop"}
          sub="Verified feedback helps people discover trusted local businesses."
        />
        <div className="grid-two">
          <form className="panel" onSubmit={submit}>
            <Field label="Choose a shop">
              <select name="b" value={b.id} onChange={(e) => go("review/" + e.target.value)}>
                {db.businesses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <label style={{ fontWeight: 700 }}>Your rating</label>
            <div className="review-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n <= stars ? "active" : ""}
                  aria-label={`Rate ${n} stars`}
                  onClick={() => setStars(n)}
                >
                  ★
                </button>
              ))}
            </div>
            <Field label="Comment (optional)">
              <textarea name="cm" maxLength={500} placeholder="What was your experience?" defaultValue={ex?.comment || ""} />
            </Field>
            {ex ? (
              <div className="notice">You already rated this shop. You can edit your rating without a new code.</div>
            ) : (
              <Field label="Verification code from receipt">
                <input name="vc" maxLength={12} autoComplete="off" style={{ textTransform: "uppercase" }} placeholder="Enter 8-character code" />
              </Field>
            )}
            <div className="err">{er}</div>
            <button className="btn btn-primary">{ex ? "Save changes" : "Submit review"}</button>
            {user ? null : (
              <p className="form-note">
                You need to{" "}
                <a
                  className="link"
                  href="#/login"
                >
                  log in
                </a>{" "}
                as a customer to submit feedback.
              </p>
            )}
          </form>
          <aside className="panel">
            <h3>How verified reviews work</h3>
            <p>01 · Visit a participating shop.</p>
            <p>02 · Keep your receipt with the verification code.</p>
            <p>03 · Sign in to your account.</p>
            <p>04 · Enter the code and submit your rating.</p>
            <div className="notice">
              The server checks your account, the shop, code expiry and single-use status. A successful review gets a
              Verified Purchase label.
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
