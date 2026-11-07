import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { useApp } from "../context/AppContext";

const hide = (e) => {
  e.currentTarget.style.visibility = "hidden";
};

/* Image with a placeholder when there is no src (and hides itself if the file is broken) */
export function Photo({ src, alt }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" onError={hide} />
  ) : (
    <div className="ph" role="img" aria-label={alt}>
      <Icon name="utensils" />
    </div>
  );
}

export function Rate({ bid }) {
  const { avg } = useApp();
  const r = avg(bid);
  return r.n ? (
    <>
      <span className="stars">
        <Icon name="star" /> {r.a.toFixed(1)}
      </span>{" "}
      <span className="muted">({r.n} verified)</span>
    </>
  ) : (
    <span className="muted">No verified ratings yet</span>
  );
}

/* One back-link used on every page: small, top-left, above the page content */
export function BackLink({ onClick, label = "Back" }) {
  return (
    <div className="page-back">
      <button type="button" className="back-link" onClick={onClick} aria-label={label} title={label}>
        <Icon name="arrow-left" />
        <span>{label}</span>
      </button>
    </div>
  );
}

export function PageTitle({ eyebrow, title, sub = "" }) {
  return (
    <div className="section-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {sub ? (
          <p className="muted" style={{ margin: 0 }}>
            {sub}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyBox({ icon, title, text, children }) {
  return (
    <div className="empty">
      <div className="emoji">
        <Icon name={icon} />
      </div>
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      {children}
    </div>
  );
}

export const Skeleton = () => (
  <div className="food-grid">
    {Array.from({ length: 8 }, (_, i) => (
      <div className="sk" key={i} />
    ))}
  </div>
);

export const Field = ({ label, children }) => (
  <div className="field">
    <label>{label}</label>
    {children}
  </div>
);

export function PasswordInput({ name, placeholder = "" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-wrap">
      <input name={name} type={show ? "text" : "password"} placeholder={placeholder} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
export function DataTable({ head, rows, empty }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows
          ) : (
            <tr>
              <td colSpan={head.length} className="muted">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export const Stat = ({ label, value, sub = "" }) => (
  <div className="stat">
    <span>{label}</span>
    <strong>{value}</strong>
    <span>{sub}</span>
  </div>
);

export function DashHead({ eyebrow, title, sub, children }) {
  return (
    <div className="dash-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {sub}
        </p>
      </div>
      {children}
    </div>
  );
}

export function Sidebar({ base, items, tab, back = null }) {
  const { go, logout } = useApp();
  return (
    <aside className="sidebar">
      {back ? (
        <button type="button" className="side-back" onClick={() => go(back.go)} aria-label={back.label} title={back.label}>
          <Icon name="arrow-left" />
        </button>
      ) : null}
      <div className="brand">
        <span className="brand-mark">
          <img src="/logo.jpg" alt="" />
        </span>
        <span>ClickBites</span>
      </div>
      {items.map(([k, l, ic]) => (
        <Link key={k} to={`/${base}/${k}`} className={tab === k ? "active" : ""}>
          <Icon name={ic} /> {l}
        </Link>
      ))}
      <a
        href="#"
        className="out"
        onClick={(e) => {
          e.preventDefault();
          logout();
        }}
      >
        <Icon name="logout" /> Log out
      </a>
    </aside>
  );
}
