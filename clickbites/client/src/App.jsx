import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Footer, Toast, Topbar } from "./components/Layout";
import QuickViewModal from "./components/QuickViewModal";
import { useApp } from "./context/AppContext";
import { dashPath } from "./lib/utils";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Shops from "./pages/Shops";
import Shop from "./pages/Shop";
import Auth from "./pages/Auth";
import Review from "./pages/Review";
import Profile from "./pages/Profile";
import Owner from "./pages/Owner";
import Admin from "./pages/Admin";

/* Page guards (same rules as the original site) */
function Guard({ role, children }) {
  const { user, toast, takeExpired } = useApp();
  const needsLogin = !user;
  const wrongRole = user && role && user.role !== role;
  const shown = useRef(false);

  useEffect(() => {
    if (!needsLogin && !wrongRole) {
      shown.current = false;
      return;
    }
    if (shown.current) return; // avoid a double toast (React StrictMode runs effects twice in dev)
    shown.current = true;
    if (needsLogin) toast(takeExpired() ? "Session expired. Please log in again." : "Please log in first.", "er");
    else toast("That page is not available for your role.", "er");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsLogin, wrongRole]);

  if (needsLogin) return <Navigate to="/login" replace />;
  if (wrongRole) return <Navigate to={"/" + dashPath(user)} replace />;
  return children;
}

/* Login / signup / forgot are skipped when already signed in */
function GuestOnly({ children }) {
  const { user } = useApp();
  return user ? <Navigate to={"/" + dashPath(user)} replace /> : children;
}

export default function App() {
  const { user, booting, checkIdle, touch } = useApp();
  const loc = useLocation();
  const [page = "home"] = loc.pathname.split("/").filter(Boolean);

  /* Every page change: check the 15-minute idle timeout, then count it as activity */
  useEffect(() => {
    checkIdle();
    touch();
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  /* Body classes used by the stylesheet */
  useEffect(() => {
    const r = user?.role;
    document.body.classList.toggle("admin-view", page === "admin" || ((page === "profile" || page === "shop") && r === "admin"));
    document.body.classList.toggle(
      "owner-view",
      page === "owner" || ((page === "profile" || page === "shop") && r === "business_owner")
    );
    document.body.classList.toggle("dashboard-view", ["admin", "owner", "profile", "review"].includes(page));
  }, [page, user]);

  return (
    <>
      <Topbar page={page} />
      <main id="app" tabIndex={-1}>
        {booting ? (
          <p className="muted" style={{ padding: "80px 20px", textAlign: "center" }}>
            Loading…
          </p>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/shops" element={<Shops />} />
            <Route path="/shop/:id" element={<Shop />} />
            <Route path="/signup" element={<GuestOnly><Auth type="signup" /></GuestOnly>} />
            <Route path="/login" element={<GuestOnly><Auth type="login" /></GuestOnly>} />
            <Route path="/forgot" element={<GuestOnly><Auth type="forgot" /></GuestOnly>} />
            <Route path="/otp" element={<Auth type="otp" />} />
            <Route path="/reset-sms" element={<Auth type="reset-sms" />} />
            <Route path="/reset/*" element={<Navigate to="/reset-sms" replace />} />
            <Route path="/review/:id?" element={<Review />} />
            <Route path="/profile/:tab?" element={<Guard><Profile /></Guard>} />
            <Route path="/owner/:tab?" element={<Guard role="business_owner"><Owner /></Guard>} />
            <Route path="/admin/:tab?" element={<Guard role="admin"><Admin /></Guard>} />
            <Route
              path="*"
              element={<Navigate to="/home" replace />}
            />
          </Routes>
        )}
      </main>
      <Footer />
      <QuickViewModal />
      <Toast />
    </>
  );
}
