import React from "react";

export default function Loading({ text = "Loading ClickBites..." }) {
  return <div className="grid min-h-40 place-items-center text-sm font-semibold text-neutral-400">{text}</div>;
}