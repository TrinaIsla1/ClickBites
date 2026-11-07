import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ReviewCard } from "../components/Cards";
import { DashHead, DataTable, EmptyBox, Field, Rate, Sidebar, Stat } from "../components/ui";
import { useApp } from "../context/AppContext";
import { cstat, fd, friendly, money, uploadImg, webp } from "../lib/utils";
import { sb } from "../lib/supabase";

const TABS = [
  ["dashboard", "Dashboard", "chart"],
  ["shop", "My shop", "store"],
  ["products", "Products", "list"],
  ["codes", "Verification codes", "receipt"],
  ["reviews", "Reviews", "review"],
  ["settings", "Settings", "settings"],
];

export default function Owner() {
  const { tab = "dashboard" } = useParams();
  const {
    db, myShop, avg, prod, cat, go, role, need, err, toast, reload, newCode, setNewCode, editId, setEditId,
  } = useApp();
  const [er, setEr] = useState("");
  const [ver, setVer] = useState(0);
  const productForm = useRef(null);
  useEffect(() => setEr(""), [tab]);

  const b = myShop();
  if (!b) return <EmptyBox icon="store" title="No shop linked" text="Please contact the administrator." />;

  const P = db.products.filter((p) => p.bid === b.id),
    C = db.codes.filter((c) => c.bid === b.id).sort((a, c) => c.created - a.created),
    R = db.ratings.filter((r) => r.bid === b.id && r.verified);

  /* ---------- actions ---------- */
  const generateCode = async (e) => {
    e.preventDefault();
    if (!role("business_owner")) return;
    const { data, error } = await sb.rpc("generate_receipt_code", { p_shop_id: Number(b.id), p_reference: "" });
    if (error) return err(friendly(error));
    setNewCode(data.code);
    await reload();
  };

  const voidCode = async (id) => {
    if (!role("business_owner")) return;
    const c = db.codes.find((x) => x.id === id);
    if (c?.bid === b.id && cstat(c) === "unused") {
      if (!need(await sb.rpc("void_receipt_code", { p_code_id: Number(id) }))) return;
      setNewCode(null);
      await reload();
    }
  };

  const toggleProduct = async (id) => {
    if (!role("business_owner")) return;
    const p = prod(id);
    if (p?.bid !== b.id) return;
    if (!need(await sb.from("products").update({ available: !p.active }).eq("id", Number(id)))) return;
    await reload();
  };

  const deleteProduct = async (id) => {
    if (!role("business_owner")) return;
    const p = prod(id);
    if (p?.bid === b.id && window.confirm("Delete this product?")) {
      if (!need(await sb.from("products").delete().eq("id", Number(id)))) return;
      await reload();
    }
  };

  const saveShop = async (ev) => {
    ev.preventDefault();
    if (!role("business_owner")) return;
    const f = ev.currentTarget.elements;
    const v = (k) => f[k].value.trim();
    if (!v("name")) return setEr("Shop name is required.");
    if (v("link") && !/^https?:\/\//i.test(v("link"))) return setEr("The link must start with http:// or https://");
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
      if (f.bn.files[0]) upd.banner_url = await uploadImg("shop-images", b.id + "/banner", await webp(f.bn.files[0], 1600));
    } catch (x) {
      return setEr("That image could not be uploaded.");
    }
    const r = await sb.from("shops").update(upd).eq("id", Number(b.id));
    if (r.error) return setEr(friendly(r.error));
    setEr("");
    await reload();
    toast("Shop saved.");
    setVer((x) => x + 1);
  };

  const saveProduct = async (ev) => {
    ev.preventDefault();
    if (!role("business_owner")) return;
    const form = ev.currentTarget;
    const f = form.elements;
    const e = prod(editId),
      file = f.i.files[0];
    if (!f.n.value.trim() || !f.d.value.trim()) return setEr("Enter a name and a description.");
    if (f.p.value === "" || +f.p.value < 0) return setEr("Enter a valid price.");
    if (!e && !file) return setEr("Please add a product photo.");
    let img = e ? e.img : "";
    try {
      if (file) img = await uploadImg("product-images", b.id + "/p-" + Date.now(), await webp(file));
    } catch (x) {
      return setEr("That image could not be uploaded.");
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
    if (r.error) return setEr(friendly(r.error));
    setEr("");
    setEditId(null);
    form.reset();
    await reload();
    toast("Product saved. It now appears in the public menu.");
    setVer((x) => x + 1);
  };

  /* ---------- pieces ---------- */
  const codeForm = (
    <div className="panel">
      <h3>Generate receipt code</h3>
      <p className="muted">One code per genuine customer transaction. Write it on the receipt. Valid 24 hours, single use.</p>
      <form onSubmit={generateCode}>
        <button className="btn btn-primary">Generate code</button>
      </form>
      {newCode ? (
        <div
          style={{
            marginTop: 18, textAlign: "center", padding: 16, background: "var(--cream)",
            border: "1px dashed var(--line)", borderRadius: 12,
          }}
        >
          <div className="codebig" style={{ marginBottom: 0 }}>
            {newCode}
          </div>
        </div>
      ) : null}
    </div>
  );

  let h = null;
  if (tab === "dashboard")
    h = (
      <>
        <div className="stats">
          <Stat label="Average rating" value={avg(b.id).n ? avg(b.id).a.toFixed(1) + " ★" : "—"} sub="Verified feedback only" />
          <Stat label="Verified reviews" value={R.length} />
          <Stat label="Products" value={P.length} sub={P.filter((p) => p.active).length + " published"} />
          <Stat label="Unused codes" value={C.filter((c) => cstat(c) === "unused").length} />
        </div>
        <div className="grid-two">
          {codeForm}
          <div className="panel">
            <h3>Recent products</h3>
            <DataTable
              head={["Product", "Price", "Status"]}
              empty="No products yet."
              rows={P.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{money(p.price)}</td>
                  <td>
                    <span className="status">{p.active ? "Published" : "Hidden"}</span>
                  </td>
                </tr>
              ))}
            />
            <button className="btn btn-soft btn-small" style={{ marginTop: 12 }} onClick={() => go("owner/products")}>
              Manage products
            </button>
          </div>
        </div>
      </>
    );

  if (tab === "shop")
    h = (
      <div className="panel">
        <form key={ver} onSubmit={saveShop}>
          {[
            ["name", "Shop name"],
            ["address", "Address"],
            ["contact", "Contact"],
            ["hours", "Hours (display text)"],
            ["link", "Main page link (https://…)"],
          ].map(([k, l]) => (
            <Field key={k} label={l}>
              <input name={k} defaultValue={b[k]} />
            </Field>
          ))}
          <div className="row">
            <Field label="Opens">
              <input name="opens" type="time" defaultValue={b.opens} />
            </Field>
            <Field label="Closes">
              <input name="closes" type="time" defaultValue={b.closes} />
            </Field>
          </div>
          <Field label="Description">
            <textarea name="desc" defaultValue={b.desc} />
          </Field>
          <Field label="Shop logo (square works best; leave empty to keep)">
            <input name="i" type="file" accept="image/*" />
          </Field>
          <Field label="Shop banner (wide photo, about 1600×640; leave empty to keep)">
            <input name="bn" type="file" accept="image/*" />
          </Field>
          {b.banner ? (
            <p className="form-note" style={{ marginTop: -6 }}>
              Current banner:{" "}
              <a className="link" href={b.banner} target="_blank" rel="noopener noreferrer">
                view
              </a>
            </p>
          ) : null}
          <div className="err">{er}</div>
          <button className="btn btn-primary">Save shop</button>
        </form>
      </div>
    );

  if (tab === "products") {
    const e = prod(editId);
    h = (
      <>
        <div className="panel">
          <h3>{e ? "Edit" : "Add"} product</h3>
          <form ref={productForm} key={(e?.id || "new") + ver} onSubmit={saveProduct}>
            <Field label="Product name">
              <input name="n" defaultValue={e?.name || ""} />
            </Field>
            <Field label="Description">
              <textarea name="d" defaultValue={e?.desc || ""} />
            </Field>
            <div className="row">
              <Field label="Price (₱)">
                <input name="p" type="number" min="0" step="0.01" defaultValue={e ? e.price : ""} />
              </Field>
              <Field label="Category">
                <select name="c" defaultValue={e?.cat}>
                  {db.cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={"Photo (compressed to WebP)" + (e ? " – leave empty to keep current" : "")}>
              <input name="i" type="file" accept="image/*" />
            </Field>
            <div className="err">{er}</div>
            <button className="btn btn-primary">{e ? "Save product" : "Add product"}</button>{" "}
            {e ? (
              <button type="button" className="btn btn-ghost" onClick={() => setEditId(null)}>
                Cancel
              </button>
            ) : null}
          </form>
        </div>
        <div className="panel" style={{ marginTop: 18 }}>
          <DataTable
            head={["Product", "Category", "Price", "Status", "Action"]}
            empty="No products yet."
            rows={P.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{cat(p.cat)?.name}</td>
                <td>{money(p.price)}</td>
                <td>
                  <span className="status">{p.active ? "Published" : "Hidden"}</span>
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-small"
                    onClick={() => {
                      if (!role("business_owner")) return;
                      setEditId(p.id);
                      window.scrollTo({ top: 0 });
                    }}
                  >
                    Edit
                  </button>{" "}
                  <button className="btn btn-ghost btn-small" onClick={() => toggleProduct(p.id)}>
                    {p.active ? "Hide" : "Show"}
                  </button>{" "}
                  <button className="btn btn-danger btn-small" onClick={() => deleteProduct(p.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          />
        </div>
      </>
    );
  }

  if (tab === "codes")
    h = (
      <>
        {codeForm}
        <div className="panel" style={{ marginTop: 18 }}>
          <DataTable
            head={["Code", "Reference", "Status", "Created", "Expires", "Used", ""]}
            empty="No codes yet."
            rows={C.map((c) => {
              const s = cstat(c);
              return (
                <tr key={c.id}>
                  <td>
                    <b>{c.code}</b>
                  </td>
                  <td>{c.ref}</td>
                  <td>
                    <span className={`status ${s}`}>{s}</span>
                  </td>
                  <td>{fd(c.created)}</td>
                  <td>{fd(c.expires)}</td>
                  <td>{c.usedAt ? fd(c.usedAt) : "—"}</td>
                  <td>
                    {s === "unused" ? (
                      <button className="btn btn-danger btn-small" onClick={() => voidCode(c.id)}>
                        Void
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          />
          <p className="form-note">The customer's identity is never shown to the shop.</p>
        </div>
      </>
    );

  if (tab === "reviews")
    h = (
      <div className="panel">
        <h3>Verified feedback</h3>
        <div>
          <Rate bid={b.id} />
        </div>
        {R.length ? (
          [...R].sort((a, c) => c.at - a.at).map((r) => <ReviewCard key={r.id} r={r} />)
        ) : (
          <p className="muted">No verified feedback yet.</p>
        )}
      </div>
    );

  if (tab === "settings")
    h = (
      <div className="panel">
        <h3>Account settings</h3>
        <p className="muted">Change your name, email or password from your profile.</p>
        <button className="btn btn-primary" onClick={() => go("profile")}>
          Open profile
        </button>
      </div>
    );

  return (
    <section className="container dashboard">
      <Sidebar base="owner" items={TABS} tab={tab} />
      <div className="dash-main">
        <DashHead
          eyebrow="Business owner portal"
          title={b.name}
          sub="Manage your listing and help customers find you."
        >
          <button className="btn btn-primary" onClick={() => go(`shop/${b.id}`)}>
            View public shop
          </button>
        </DashHead>
        {h}
      </div>
    </section>
  );
}
