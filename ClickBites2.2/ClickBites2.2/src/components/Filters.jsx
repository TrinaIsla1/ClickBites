import React from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

function Select({ value, onChange, options }) {
  return (
    <label className="relative flex h-8 items-center overflow-hidden rounded-lg border border-[#e4e4e4] bg-[#eeeeed]">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-full appearance-none bg-transparent py-1 pl-3 pr-7 text-[10px] font-semibold text-[#666] outline-none">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 text-[#888]" />
    </label>
  );
}

export default function Filters({ category, setCategory, price, setPrice, rating, setRating, openOnly, setOpenOnly, categories, prices, ratings, count }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[#e6e6e6] pb-2">
      <span className="flex items-center gap-1 text-[9px] font-extrabold tracking-wide text-[#666]"><SlidersHorizontal size={12}/> FILTERS:</span>
      <Select value={category} onChange={setCategory} options={categories}/>
      <Select value={price} onChange={setPrice} options={prices}/>
      <Select value={rating} onChange={setRating} options={ratings}/>
      <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#e4e4e4] bg-[#eeeeed] px-2.5 text-[10px] font-semibold text-[#666]">
        <input className="h-3 w-3 accent-[#f58220]" type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
        Open Now Only
      </label>
      <span className="ml-auto hidden text-[9px] text-[#999] sm:block">{count} results</span>
    </div>
  );
}
