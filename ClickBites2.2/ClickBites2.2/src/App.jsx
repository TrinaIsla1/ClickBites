import React from "react";
import { useAuth } from "./hooks/useAuth";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Loading from "./components/Loading";

export default function App() {
  const auth = useAuth();
  const [page, setPage] = React.useState("home");

  if (auth.loading) return <Loading/>;

  return (
    <div>
      <nav className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-full border border-[#e4e4e4] bg-white/95 p-1 shadow-lg backdrop-blur">
        <button onClick={() => setPage("home")} className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${page === "home" ? "bg-[#f58220] text-white" : "text-neutral-600"}`}>Home</button>
        {auth.user && <button onClick={() => setPage("profile")} className={`rounded-full px-4 py-2 text-xs font-bold ${page === "profile" ? "bg-orange-500 text-white" : "text-neutral-600"}`}>Profile</button>}
        {auth.user && ["admin","partner","rider"].includes(auth.user.role) && <button onClick={() => setPage("dashboard")} className={`rounded-full px-4 py-2 text-xs font-bold ${page === "dashboard" ? "bg-orange-500 text-white" : "text-neutral-600"}`}>Dashboard</button>}
      </nav>

      {page === "home" && <Home auth={auth}/>}
      {page === "profile" && <Profile user={auth.user}/>}
      {page === "dashboard" && <Dashboard user={auth.user}/>}
    </div>
  );
}