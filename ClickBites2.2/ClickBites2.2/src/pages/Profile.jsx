import React from "react";
import { UserRound } from "lucide-react";

export default function Profile({ user }) {
  return (
    <div className="mx-auto max-w-xl p-5">
      <div className="rounded-2xl border bg-white p-6">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-orange-600"><UserRound/></div>
        <h1 className="mt-4 text-xl font-black">{user?.name || "Guest"}</h1>
        <p className="text-sm text-neutral-500">{user?.email || "Not signed in"}</p>
        <div className="mt-5 grid gap-3 text-xs">
          <div className="rounded-lg bg-neutral-50 p-3"><b>Role:</b> {user?.role || "customer"}</div>
          <div className="rounded-lg bg-neutral-50 p-3"><b>Phone:</b> {user?.phone || "Not provided"}</div>
        </div>
      </div>
    </div>
  );
}