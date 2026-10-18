import React from "react";
import { Search, UserRound, LogOut, Store } from "lucide-react";
import Logo from "./Logo";

export default function Header({ query, setQuery, user, onLogin, onRegister, onLogout, onPartnerLogin }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e9e9e9] bg-[#f8f8f7]/95 backdrop-blur-md">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-2 px-4 py-2.5 sm:grid-cols-[210px_minmax(260px,1fr)_210px] sm:items-center sm:gap-5">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="justify-self-start">
          <Logo />
        </button>

        <div className="flex h-9 items-center gap-2 rounded-full border border-[#e4e4e4] bg-[#eeeeed] px-3.5 text-[#a4a4a4] shadow-inner">
          <Search size={16} strokeWidth={2.2} />
          <input
            className="w-full bg-transparent text-[11px] text-[#555] outline-none placeholder:text-[#a7a7a7]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search local dishes, categories, or restaurants in Calbayog..."
          />
        </div>

        <div className="flex justify-end gap-1.5">
          {user ? (
            <>
              <span className="hidden items-center gap-1.5 rounded-full bg-[#fff1e5] px-3 py-1.5 text-[10px] font-bold text-[#d86f12] md:flex">
                <UserRound size={13} /> {user.name}
              </span>
              <button onClick={onLogout} className="rounded-full border border-[#e8e8e8] bg-white px-3 py-1.5 text-[10px] font-bold text-[#666] hover:bg-[#fafafa]">
                <span className="flex items-center gap-1"><LogOut size={13}/> Logout</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={onPartnerLogin || onLogin} className="hidden items-center gap-1 rounded-full border border-[#f2dfca] bg-[#fffaf5] px-3 py-1.5 text-[10px] font-bold text-[#c97824] hover:bg-[#fff3e7] sm:flex">
                <Store size={13}/> Partner Login
              </button>
              <button onClick={onLogin} className="rounded-full border border-[#f2dfca] bg-[#fff8f0] px-3 py-1.5 text-[10px] font-bold text-[#c97824]">
                Login
              </button>
              <button onClick={onRegister} className="rounded-full bg-[#f58220] px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-[#e97512]">
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
