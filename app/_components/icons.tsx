import type { ReactNode } from "react";

interface IconProps {
  size?: number;
  stroke?: number;
}

const Icon = ({
  size = 16,
  stroke = 1.6,
  children,
}: IconProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export type IconName =
  | "home" | "sparkle" | "megaphone" | "folder" | "code" | "badge" | "shield"
  | "users" | "bell" | "settings" | "search" | "chevron" | "chevronRight"
  | "arrowUp" | "plus" | "check" | "lock" | "link" | "paperclip" | "mic"
  | "send" | "doc" | "clock" | "calendar" | "thumbsUp" | "thumbsDown" | "copy"
  | "refresh" | "filter" | "panel" | "panelRight" | "dots" | "globe"
  | "database" | "flag" | "building" | "spark" | "cpu" | "bookmark" | "umbrella" | "heart";

export const I: Record<IconName, (p?: IconProps) => ReactNode> = {
  home: (p) => (<Icon {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></Icon>),
  sparkle: (p) => (<Icon {...p}><path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.6 10.4 12.2 5 10.6 10.4 9 12 3.5Z" /><path d="M18.5 16.5 19 18l1.5.5L19 19l-.5 1.5L18 19l-1.5-.5L18 18l.5-1.5Z" /></Icon>),
  megaphone: (p) => (<Icon {...p}><path d="M3 10v4a1 1 0 0 0 1 1h2l8 4V5L6 9H4a1 1 0 0 0-1 1Z" /><path d="M17 8a4 4 0 0 1 0 8" /></Icon>),
  folder: (p) => (<Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></Icon>),
  code: (p) => (<Icon {...p}><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m14 6-4 12" /></Icon>),
  badge: (p) => (<Icon {...p}><path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z" /></Icon>),
  shield: (p) => (<Icon {...p}><path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></Icon>),
  users: (p) => (<Icon {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M15 14c3.3 0 6 2.5 6 6" /></Icon>),
  bell: (p) => (<Icon {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20a2 2 0 0 0 4 0" /></Icon>),
  settings: (p) => (<Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /></Icon>),
  search: (p) => (<Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>),
  chevron: (p) => (<Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>),
  chevronRight: (p) => (<Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>),
  arrowUp: (p) => (<Icon {...p}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></Icon>),
  plus: (p) => (<Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>),
  check: (p) => (<Icon {...p}><path d="m5 12 4 4 10-10" /></Icon>),
  lock: (p) => (<Icon {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>),
  link: (p) => (<Icon {...p}><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></Icon>),
  paperclip: (p) => (<Icon {...p}><path d="m20 12-8 8a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5L10 18a2 2 0 0 1-3-3l7-7" /></Icon>),
  mic: (p) => (<Icon {...p}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Icon>),
  send: (p) => (<Icon {...p}><path d="m4 12 16-8-6 18-3-7-7-3Z" /></Icon>),
  doc: (p) => (<Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></Icon>),
  clock: (p) => (<Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>),
  calendar: (p) => (<Icon {...p}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 10h16M8 3v4M16 3v4" /></Icon>),
  thumbsUp: (p) => (<Icon {...p}><path d="M7 11v9H4v-9h3Zm0 0 4-7a2 2 0 0 1 2 2v3h5a2 2 0 0 1 2 2l-2 6a2 2 0 0 1-2 1h-9" /></Icon>),
  thumbsDown: (p) => (<Icon {...p}><path d="M7 13V4H4v9h3Zm0 0 4 7a2 2 0 0 0 2-2v-3h5a2 2 0 0 0 2-2l-2-6a2 2 0 0 0-2-1h-9" /></Icon>),
  copy: (p) => (<Icon {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></Icon>),
  refresh: (p) => (<Icon {...p}><path d="M4 4v6h6" /><path d="M20 20v-6h-6" /><path d="M5 14a8 8 0 0 0 14 3M19 10A8 8 0 0 0 5 7" /></Icon>),
  filter: (p) => (<Icon {...p}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" /></Icon>),
  panel: (p) => (<Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></Icon>),
  panelRight: (p) => (<Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></Icon>),
  dots: (p) => (<Icon {...p}><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></Icon>),
  globe: (p) => (<Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Icon>),
  database: (p) => (<Icon {...p}><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></Icon>),
  flag: (p) => (<Icon {...p}><path d="M5 21V4l8 2 6-2v11l-6 2-8-2Z" /></Icon>),
  building: (p) => (<Icon {...p}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" /></Icon>),
  spark: (p) => (<Icon {...p}><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4" /></Icon>),
  cpu: (p) => (<Icon {...p}><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></Icon>),
  bookmark: (p) => (<Icon {...p}><path d="M6 3h12v18l-6-4-6 4V3Z" /></Icon>),
  umbrella: (p) => (<Icon {...p}><path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z" /><path d="M12 12v6a2 2 0 0 0 4 0" /></Icon>),
  heart: (p) => (<Icon {...p}><path d="M12 20s-7-4.5-9.5-9A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9Z" /></Icon>),
};
