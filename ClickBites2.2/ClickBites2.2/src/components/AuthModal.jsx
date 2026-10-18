import React, { useState } from "react";
import { Eye, EyeOff, Store, UserRound, X } from "lucide-react";

export default function AuthModal({ mode, role, onClose, onSwitch, onSubmit, error, loading }) {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });

  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-neutral-100 text-neutral-600"><X size={17}/></button>
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-orange-500 text-white">{role === "partner" ? <Store/> : <UserRound/>}</div>
        <h2 className="text-center text-xl font-black">{mode === "login" ? "Welcome back!" : "Create your account"}</h2>
        <p className="mb-5 text-center text-[11px] text-neutral-400">{role === "partner" ? "Partner account" : "Customer account"} · Calbayog City</p>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="grid gap-3">
          {mode === "register" && <>
            <label className="text-[10px] font-bold text-neutral-600">Full Name
              <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400" placeholder="Juan Dela Cruz"/>
            </label>
            <label className="text-[10px] font-bold text-neutral-600">Phone Number
              <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400" placeholder="09XX XXX XXXX"/>
            </label>
          </>}
          <label className="text-[10px] font-bold text-neutral-600">Email Address
            <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs outline-none focus:border-orange-400" placeholder="you@example.com"/>
          </label>
          <label className="text-[10px] font-bold text-neutral-600">Password
            <span className="relative mt-1 block">
              <input required type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 pr-10 text-xs outline-none focus:border-orange-400" placeholder="••••••••"/>
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
            </span>
          </label>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</div>}
          <button disabled={loading} className="rounded-lg bg-orange-500 px-4 py-3 text-xs font-black text-white disabled:opacity-60">
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center text-[10px] text-neutral-400">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => onSwitch(mode === "login" ? "register" : "login")} className="ml-1 font-extrabold text-orange-600">
            {mode === "login" ? "Register" : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}