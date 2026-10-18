import React from "react";
import { Heart, MapPin, Star } from "lucide-react";
import { peso } from "../utils/format";

export default function FoodCard({ product, liked, onFavorite, onOpen }) {
  return (
    <article onClick={() => onOpen(product)} className="group cursor-pointer overflow-hidden rounded-[13px] border border-[#dedede] bg-white shadow-[0_1px_3px_rgba(0,0,0,.05)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative h-[150px] overflow-hidden bg-[#dedede]">
        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]" />
        <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[8px] font-extrabold text-white shadow-sm ${product.shop_open ? "bg-[#32b77a]" : "bg-[#707070]"}`}>
          {product.shop_open ? "Open Now" : "Closed"}
        </span>
        <span className="absolute bottom-2 right-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-black text-[#444] shadow-sm">{peso(product.price)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(product.id); }}
          className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 shadow-sm ${liked ? "text-[#f58220]" : "text-[#666]"}`}
          aria-label="Favorite"
        >
          <Heart size={14} fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] font-medium text-[#a0a0a0]">{product.category}</span>
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#d99a20]"><Star size={11} fill="currentColor"/>{product.rating}</span>
        </div>
        <h3 className="mt-1 text-[11px] font-extrabold leading-tight text-[#383838]">{product.name}</h3>
        <div className="mt-1.5 flex items-center gap-1 text-[8.5px] text-[#777]"><MapPin size={11}/>{product.shop_name}</div>
      </div>
    </article>
  );
}
