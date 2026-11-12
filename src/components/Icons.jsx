export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="url(#clipora-grad)" />
      <path d="M13 10.5v11l9-5.5-9-5.5Z" fill="#fff" />
      <defs>
        <linearGradient id="clipora-grad" x1="4" y1="2" x2="30" y2="30">
          <stop stopColor="#FF5A3C" />
          <stop offset="1" stopColor="#FFB347" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function IconYoutube() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#FF0033" />
      <path d="M10 8.8v6.4l6-3.2-6-3.2Z" fill="#fff" />
    </svg>
  )
}

export function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#1877F2" />
      <path
        d="M13.6 19v-6.1h2.05l.3-2.35H13.6V9.05c0-.64.18-1.08 1.1-1.08h1.32V5.87c-.23-.03-.99-.1-1.89-.1-1.87 0-3.15 1.14-3.15 3.24v1.54H9v2.35h2.03V19h2.57Z"
        fill="#fff"
      />
    </svg>
  )
}

export function IconTiktok() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#111" />
      <path
        d="M15.4 7.2c.7.82 1.62 1.4 2.7 1.6v2.05a5.4 5.4 0 0 1-2.7-.73v4.48a4.6 4.6 0 1 1-4-4.56v2.12a2.5 2.5 0 1 0 1.7 2.37V6.3h2.3v.9Z"
        fill="#25F4EE"
      />
      <path
        d="M14.9 6.7c.7.82 1.62 1.4 2.7 1.6v2.05a5.4 5.4 0 0 1-2.7-.73v4.48a4.6 4.6 0 1 1-4-4.56v2.12a2.5 2.5 0 1 0 1.7 2.37V5.8h2.3v.9Z"
        fill="#FE2C55"
      />
      <path
        d="M14.9 6.45c.7.82 1.62 1.4 2.7 1.6v2.05a5.4 5.4 0 0 1-2.7-.73v4.48a4.6 4.6 0 1 1-4-4.56v2.12a2.5 2.5 0 1 0 1.7 2.37V5.55h2.3v.9Z"
        fill="#fff"
      />
    </svg>
  )
}

export function IconX() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#0F1419" />
      <path
        d="M16.9 6.5h1.86l-4.06 4.64 4.78 6.36h-3.74l-2.93-3.83-3.35 3.83H7.6l4.34-4.96L7.4 6.5h3.84l2.64 3.5 3.02-3.5Zm-.65 9.9h1.03L9.8 7.54H8.7l7.55 8.86Z"
        fill="#fff"
      />
    </svg>
  )
}

export const PLATFORM_ICONS = {
  youtube: IconYoutube,
  facebook: IconFacebook,
  tiktok: IconTiktok,
  x: IconX,
}

export function IconGear() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19 12.7v-1.4l1.6-1.25-.9-1.8-1.95.4a7.2 7.2 0 0 0-1.2-.7l-.35-2h-2.4l-.35 2c-.42.16-.82.4-1.2.7l-1.95-.4-.9 1.8L5 11.3v1.4L3.4 13.95l.9 1.8 1.95-.4c.38.3.78.54 1.2.7l.35 2h2.4l.35-2c.42-.16.82-.4 1.2-.7l1.95.4.9-1.8L19 12.7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconClose() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconPaste() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="11" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 16V6.5A1.5 1.5 0 0 1 7.5 5H15" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function IconClear() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M7 7h13l-1.5 12.2A2 2 0 0 1 16.51 21H10.5a2 2 0 0 1-1.99-1.8L7 7Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 7h16M10 7V5.8A1.8 1.8 0 0 1 11.8 4h2.4A1.8 1.8 0 0 1 16 5.8V7" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}
