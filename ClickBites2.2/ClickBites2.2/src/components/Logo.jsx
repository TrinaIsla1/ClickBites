import React from "react";
import { Utensils } from "lucide-react";

export default function Logo() {
  return (
    <div className="flex items-center gap-2 text-left">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f58220] text-white shadow-sm">
        <Utensils size={19} strokeWidth={2.4} />
      </span>
      <span>
        <strong className="block text-[17px] font-black leading-[17px] tracking-tight text-[#252525]">ClickBites</strong>
        <small className="block text-[9px] font-semibold leading-3 text-[#888]">Calbayog City</small>
      </span>
    </div>
  );
}
