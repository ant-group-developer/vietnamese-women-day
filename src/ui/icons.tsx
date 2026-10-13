import type { ReactNode, SVGProps } from 'react'

/** Bộ icon nét tròn đồng bộ cho các nút: cùng khung 24, nét 2.4, màu theo currentColor. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const MinusIcon = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
)

export const RotateLeftIcon = () => (
  <Icon>
    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
    <path d="M4 4v4.5h4.5" />
  </Icon>
)

export const RotateRightIcon = () => (
  <Icon>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4.5h-4.5" />
  </Icon>
)

export const TargetIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
  </Icon>
)

export const HelpIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.3-2.5 3.8" />
    <circle cx="12" cy="17.2" r="0.6" fill="currentColor" />
  </Icon>
)

export const SettingsIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
)

export const ChevronLeftIcon = () => (
  <Icon>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </Icon>
)

export const ChevronRightIcon = () => (
  <Icon>
    <path d="M9.5 5.5L16 12l-6.5 6.5" />
  </Icon>
)

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export function VolumeIcon({ level }: { level: number }) {
  return (
    <Icon>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      {level === 0 ? (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      ) : (
        <>
          <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
          {level >= 0.5 && <path d="M18.5 6.5a8 8 0 0 1 0 11" />}
        </>
      )}
    </Icon>
  )
}
