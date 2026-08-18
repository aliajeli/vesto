/* -------------------------------------------------------------- آیکون‌ها */
const ic = (path, extra = null) => (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={props?.strokeWidth || 1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={props?.size || 20}
    height={props?.size || 20}
    aria-hidden="true"
    {...props}
  >
    <path d={path} />
    {extra}
  </svg>
);

export const Icons = {
  cart: ic('M3 3h2l.4 2M7 13h10l3-8H5.4M7 13 5.4 5M7 13l-2 5h13', <><circle cx="9" cy="20" r="1.6" /><circle cx="18" cy="20" r="1.6" /></>),
  user: ic('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', <circle cx="12" cy="7" r="4" />),
  search: ic('m21 21-4.3-4.3', <circle cx="11" cy="11" r="7" />),
  heart: ic('M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z'),
  menu: ic('M3 6h18M3 12h18M3 18h18'),
  close: ic('M18 6 6 18M6 6l12 12'),
  chevronLeft: ic('m15 18-6-6 6-6'),
  chevronRight: ic('m9 18 6-6-6-6'),
  chevronDown: ic('m6 9 6 6 6-6'),
  plus: ic('M12 5v14M5 12h14'),
  minus: ic('M5 12h14'),
  trash: ic('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', null),
  star: ic('m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z'),
  check: ic('m20 6-11 11-5-5'),
  truck: ic('M10 17h4V5H2v12h3M20 17h2v-4l-3-4h-5v8h3', <><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>),
  shield: ic('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'),
  refresh: ic('M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5'),
  tag: ic('M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z', <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />),
  grid: ic('M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'),
  box: ic('M21 8 12 3 3 8v8l9 5 9-5z', <path d="M3 8l9 5 9-5M12 13v8" />),
  chart: ic('M3 3v18h18M7 15l4-5 3 3 5-7'),
  wallet: ic('M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M3 7h16', <circle cx="17" cy="14" r="1.4" fill="currentColor" />),
  settings: ic('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.6 0z" />),
  users: ic('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.9', <><circle cx="9" cy="7" r="4" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></>),
  logout: ic('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'),
  eye: ic('M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z', <circle cx="12" cy="12" r="3" />),
  filter: ic('M3 5h18l-7 8v6l-4 2v-8z'),
  instagram: ic('M16 3H8a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h8a5 5 0 0 0 5-5V8a5 5 0 0 0-5-5z', <><circle cx="12" cy="12" r="3.5" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" /></>),
  phone: ic('M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z'),
  mail: ic('M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', <path d="m22 6-10 7L2 6" />),
  pin: ic('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', <circle cx="12" cy="10" r="3" />),
  edit: ic('M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />),
  download: ic('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'),
  alert: ic('M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'),
  clock: ic('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', <path d="M12 6v6l4 2" />),
  sparkle: ic('m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z'),
  copy: ic('M9 9h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z', <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />),
  home: ic('m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', <path d="M9 22V12h6v10" />),
  package: ic('m7.5 4.3 9 5.2M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />),
  ticket: ic('M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z'),
  layers: ic('m12 2 9 5-9 5-9-5z', <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />),
  arrowLeft: ic('M19 12H5M12 19l-7-7 7-7'),
  arrowRight: ic('M5 12h14M12 5l7 7-7 7'),
  book: ic('M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z'),
  bell: ic('M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0'),
};
