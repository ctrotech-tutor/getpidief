"use client"

export function TopNavLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-sm"
    >
      <rect x="2" y="4" width="20" height="24" rx="4" className="fill-primary" />
      <rect
        x="10"
        y="8"
        width="20"
        height="20"
        rx="4"
        className="fill-blue-400 mix-blend-multiply dark:mix-blend-screen opacity-90"
      />
      <circle cx="20" cy="18" r="4" fill="white" />
    </svg>
  )
}
