import React from "react";
import { ArrowRight, Clock3, Heart, MapPin, Star, X } from "lucide-react";
import { peso } from "../utils/format";

export default function FoodModal({ product, liked, onClose, onFavorite }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-neutral-600"><X/></button>
        <img src={product.image_url} alt={product.name} className="h-64 w-full object-cover" />
        <div className="p-5">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-1 text-[9px] font-bold text-white ${product.shop_open ? "bg-emerald-500" : "bg-neutral-600"}`}>{product.shop_open ? "Open Now" : "Closed"}</span>
            <span className="text-[10px] text-neutral-400">{product.category}</span>
          </div>
          <h2 className="mt-2 text-2xl font-black">{product.name}</h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500"><MapPin size={15}/>{product.shop_name}</p>
          <div className="my-4 flex flex-wrap items-center gap-5 border-y border-neutral-100 py-4">
            <b className="text-xl text-orange-600">{peso(product.price)}</b>
            <span className="flex items-center gap-1 text-xs text-neutral-600"><Star size={14} fill="currentColor" className="text-amber-500"/> {product.rating}</span>
            <span className="flex items-center gap-1 text-xs text-neutral-500"><Clock3 size={14}/> Local info</span>
          </div>
          <p className="text-sm leading-6 text-neutral-600">{product.description || "Discover this local favorite in Calbayog City. Support local shops and discover authentic food around the community."}</p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => onFavorite(product.id)} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-3 text-xs font-bold text-neutral-700">
              <Heart size={16} fill={liked ? "currentColor" : "none"} /> {liked ? "Saved" : "Save"}
            </button>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-xs font-bold text-white">
              Visit Official Page <ArrowRight size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}