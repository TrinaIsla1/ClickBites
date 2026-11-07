import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { useApp } from "../context/AppContext";
import { dashPath } from "../lib/utils";

const Brand = ({ footer = false }) => (
  <Link className={`brand${footer ? " footer-brand" : ""}`} to="/home" aria-label="ClickBites home">
    <span className="brand-mark" aria-hidden="true">
      <img src="/logo.jpg" alt="" />
    </span>
    <span>
      Click<span>Bites</span>
      <small>Discover. Local. Delicious.</small>
    </span>
  </Link>
);

export function Topbar({ page }) {
  const { user, go, resetFilters } = useApp();
  const [navOpen, setNavOpen] = useState(false);
  const loc = useLocation();

  let actions = null;
  if (user && (page === "admin" || page === "owner" || page === "shop")) actions = null;
  else if (user && page === "profile" && user.role !== "normal_user") actions = null;
  else if (user) {
    actions =
      user.role === "normal_user" ? (
        <button className="btn btn-ghost topbar-profile-btn" onClick={() => go(dashPath(user))} aria-label="My account" title="My account">
          <span className="topbar-avatar">{user.avatar ? <img src={user.avatar} alt="Profile" /> : <Icon name="user" />}</span>
        </button>
      ) : (
        <button className="btn btn-ghost" onClick={() => go(dashPath(user))}>
          Dashboard
        </button>
      );
  } else {
    actions = (
      <>
        <button className="btn btn-primary" onClick={() => go("login")}>
          Log in
        </button>
        <button className="btn btn-ghost" onClick={() => go("signup")}>
          Sign up
        </button>
      </>
    );
  }

  /* Close the mobile menu when the page changes */
  const [lastPath, setLastPath] = useState(loc.pathname);
  if (lastPath !== loc.pathname) {
    setLastPath(loc.pathname);
    setNavOpen(false);
  }

  const link = (to, key, label, fresh) => (
    <Link
      to={`/${to}`}
      className={page === key ? "active" : ""}
      onClick={() => fresh && resetFilters()}
    >
      {label}
    </Link>
  );

  return (
    <header className="topbar">
      <Brand />
      <button className="mobile-menu" onClick={() => setNavOpen((o) => !o)} aria-label="Open navigation">
        <svg viewBox="0 0 24 24" className="icon-svg">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <nav id="mainNav" className={navOpen ? "open" : ""} aria-label="Main navigation">
        {link("home", "home", "Discover")}
        {link("search", "search", "Find food", true)}
        {link("shops", "shops", "Shops", true)}
      </nav>
      <div className="nav-actions">{actions}</div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <Brand footer />
      <p>Helping Calbayog City discover and support local food businesses.</p>
      <small className="footer-copy">© 2026 ClickBites · Food discovery and business promotion only.</small>
    </footer>
  );
}

export function Toast() {
  const { toastState } = useApp();
  return (
    <div
      className={`toast${toastState.show ? " show" : ""}`}
      style={toastState.type === "er" ? { background: "#B3261E" } : undefined}
      role="status"
      aria-live="polite"
    >
      {toastState.msg}
    </div>
  );
}
