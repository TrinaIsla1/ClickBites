import React from "react";
import { Search } from "lucide-react";

export default function EmptyState({ onClear }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-14 text-center">
      <Search className="mx-auto text-neutral-300" size={42}/>
      <h3 className="mt-3 font-black text-neutral-700">No food found</h3>
      <p className="mt-1 text-xs text-neutral-400">Try another search or clear your filters.</p>
      <button onClick={onClear} className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white">Clear filters</button>
    </div>
  );
}