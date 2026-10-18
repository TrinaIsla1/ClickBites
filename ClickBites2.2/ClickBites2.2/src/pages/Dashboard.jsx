import React, { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Package, Users } from "lucide-react";
import { api } from "../api";
import Loading from "../components/Loading";
import { peso } from "../utils/format";

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.adminStats(), api.orders()])
      .then(([s, o]) => { setStats(s); setOrders(o.orders); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Loading dashboard..."/>;
  if (!["admin", "partner", "rider"].includes(user?.role)) {
    return <div className="rounded-xl bg-white p-8 text-center text-sm text-neutral-500">Dashboard access is for partners, riders, and admins.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-5">
      <h1 className="text-2xl font-black">ClickBites Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">Signed in as {user.name} ({user.role}).</p>
      {stats && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Users", stats.users, Users],
            ["Shops", stats.shops, Package],
            ["Orders", stats.orders, CheckCircle2],
            ["Revenue", peso(stats.revenue), BarChart3]
          ].map(([label, value, Icon]) => (
            <div key={label} className="rounded-xl border bg-white p-5">
              <Icon className="text-orange-500" size={20}/>
              <p className="mt-3 text-xs text-neutral-400">{label}</p>
              <b className="text-xl">{value}</b>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4 font-black">Recent Orders</div>
        {orders.length === 0 ? <div className="p-6 text-sm text-neutral-400">No orders yet.</div> : orders.slice(0, 10).map(o => (
          <div key={o.id} className="flex items-center justify-between border-b p-4 last:border-0">
            <span className="text-xs font-bold">Order #{o.id}</span>
            <span className="text-xs text-neutral-500">{o.status}</span>
            <b className="text-xs">{peso(o.total)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}