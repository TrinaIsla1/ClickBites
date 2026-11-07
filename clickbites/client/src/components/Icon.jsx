const P = {
  "bold-arrow-left": <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2.8" />,
  "arrow-left": <path d="M19 12H5M12 19l-7-7 7-7" />,
  utensils: <path d="M7 3v7M4.5 3v4.5A2.5 2.5 0 0 0 7 10a2.5 2.5 0 0 0 2.5-2.5V3M7 10v11M17 3c-2 2-3 4.2-3 7v2h3v9M17 3v9" />,
  soup: <path d="M4 11h16a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7ZM3 21h18M8 3v4M12 2v5M16 3v4" />,
  sandwich: <path d="M4 10a8 8 0 0 1 16 0v1H4v-1ZM4 14h16l-2 5H6l-2-5ZM7 11v3M12 11v3M17 11v3" />,
  cup: <path d="M5 4h12l-1 17H7L5 4ZM4 4h14M17 7h2a2 2 0 0 1 0 4h-2M9 2v2M13 2v2" />,
  cake: <path d="M4 12h16v8H4zM4 12c0-2 2-3 4-1 2-3 5-3 7 0 2-2 5-1 5 1M8 16v1M12 16v1M16 16v1M12 2v3M10 5h4" />,
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  heart: <path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.4Z" />,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V10Z" />,
  store: <path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  phone: <path d="M7 3H4a1 1 0 0 0-1 1c0 9 8 17 17 17a1 1 0 0 0 1-1v-3l-5-2-2 3a14 14 0 0 1-6-6l3-2-2-5Z" />,
  shield: (
    <>
      <path d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
  chart: <path d="M4 20V4M4 20h17M8 16v-4M13 16V7M18 16v-7" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 13.5a7 7 0 0 0 0-3l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L13.5 2h-4L9 5.1a8 8 0 0 0-2.6 1.5L4 5.6 2 9l2 1.5a7 7 0 0 0 0 3L2 15l2 3.4 2.4-1A8 8 0 0 0 9 19.9l.5 3.1h4l.5-3.1a8 8 0 0 0 2.6-1.5l2.4 1 2-3.4Z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" />
    </>
  ),
  tag: (
    <>
      <path d="M20 13 13 20 3 10V3h7l10 10Z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </>
  ),
  review: (
    <>
      <path d="M4 4h16v13H9l-5 4V4Z" />
      <path d="m12 7 1.3 2.6 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4L12 7Z" />
    </>
  ),
  flag: <path d="M5 21V4M5 4c5-4 9 4 14 0v10c-5 4-9-4-14 0" />,
  logout: <path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  receipt: (
    <>
      <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
};

export default function Icon({ name, className = "" }) {
  return (
    <svg
      className={`icon-svg ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {P[name] || P.utensils}
    </svg>
  );
}
