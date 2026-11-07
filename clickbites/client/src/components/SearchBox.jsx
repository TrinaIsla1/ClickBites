import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

/* Search form with a keyboard-navigable suggestions dropdown.
   getSuggestions(lowercasedText) -> [{ key, label, onPick }] */
export default function SearchBox({ value = "", placeholder, ariaLabel, onSubmit, getSuggestions, style }) {
  const [val, setVal] = useState(value);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const ref = useRef(null);

  useEffect(() => setVal(value), [value]);
  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const q = val.trim().toLowerCase();
  const items = open && q ? getSuggestions(q) : [];

  const pick = (it) => {
    setOpen(false);
    setHi(-1);
    it.onPick();
  };

  const onKeyDown = (e) => {
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      setHi(hi < items.length - 1 ? hi + 1 : 0);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      setHi(hi > 0 ? hi - 1 : items.length - 1);
    } else if (e.key === "Enter" && hi >= 0) {
      e.preventDefault();
      pick(items[hi]);
    }
  };

  return (
    <form
      ref={ref}
      className="searchbox"
      autoComplete="off"
      style={{ position: "relative", ...style }}
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        onSubmit(val.trim());
      }}
    >
      <span className="search-icon">
        <Icon name="search" />
      </span>
      <input
        name="q"
        value={val}
        autoComplete="off"
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          setVal(e.target.value);
          setOpen(true);
          setHi(-1);
        }}
        onKeyDown={onKeyDown}
      />
      <button className="btn btn-primary" type="submit">
        Search
      </button>
      <div className="suggestions-dropdown" style={{ display: items.length ? "block" : "none" }}>
        {items.map((it, i) => (
          <div
            key={it.key}
            className={`suggestion-item${i === hi ? " highlighted" : ""}`}
            onClick={() => pick(it)}
            ref={(el) => i === hi && el && el.scrollIntoView({ block: "nearest" })}
            style={it.style}
          >
            {it.label}
          </div>
        ))}
      </div>
    </form>
  );
}
