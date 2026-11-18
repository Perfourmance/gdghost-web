// 시안 HTML의 인라인 SVG 아이콘 (선 2~2.4, 둥근 끝). 이모지 아이콘은 쓰지 않는다 (가이드 4-3)
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Line({ children, strokeWidth = 2.1, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  )
}

function Solid({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      {children}
    </svg>
  )
}

export const IconSearch = (p: IconProps) => (
  <Line strokeWidth={1.9} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.2-3.2" />
  </Line>
)
export const IconBell = (p: IconProps) => (
  <Line strokeWidth={1.9} {...p}>
    <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </Line>
)
export const IconUser = (p: IconProps) => (
  <Line strokeWidth={1.9} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-3.8 4.5-5.5 8-5.5s6.5 1.7 8 5.5" />
  </Line>
)
export const IconHome = (p: IconProps) => (
  <Line strokeWidth={1.9} {...p}>
    <path d="M4 11l8-7 8 7" />
    <path d="M6 9.5V20h12V9.5" />
  </Line>
)
export const IconChat = (p: IconProps) => (
  <Line {...p}>
    <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
  </Line>
)
export const IconCalendar = (p: IconProps) => (
  <Line strokeWidth={1.9} {...p}>
    <rect x="4" y="6" width="16" height="14" rx="2" />
    <path d="M4 10h16M8 4v4M16 4v4" />
  </Line>
)
export const IconBookmark = (p: IconProps) => (
  <Line {...p}>
    <path d="M7 4h10v16l-5-3.5L7 20z" />
  </Line>
)
export const IconBookmarkFill = (p: IconProps) => (
  <Solid {...p}>
    <path d="M7 4h10v16l-5-3.5L7 20z" />
  </Solid>
)
export const IconFeed = (p: IconProps) => (
  <Line strokeWidth={1.9} {...p}>
    <path d="M8 9h8M8 13h5" />
    <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
  </Line>
)
export const IconPencil = (p: IconProps) => (
  <Line strokeWidth={2.2} {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Line>
)
export const IconSend = (p: IconProps) => (
  <Line strokeWidth={2.2} {...p}>
    <path d="M4 12l16-8-6 16-2.5-6.5z" />
    <path d="M11.5 13.5L20 4" />
  </Line>
)
export const IconEye = (p: IconProps) => (
  <Line strokeWidth={2} {...p}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.6" />
  </Line>
)
export const IconStar = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2l3 7 7 .6-5.3 4.6 1.7 7.3L12 17.8 5.6 21.5l1.7-7.3L2 9.6 9 9z" />
  </Solid>
)
export const IconCup = (p: IconProps) => (
  <Line strokeWidth={2} {...p}>
    <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
    <path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17" />
    <path d="M8 3.5c0 1.2 1 1.2 1 2.4M12 3.5c0 1.2 1 1.2 1 2.4" />
  </Line>
)
export const IconLock = (p: IconProps) => (
  <Line strokeWidth={2.6} {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Line>
)
export const IconBack = (p: IconProps) => (
  <Line strokeWidth={2.2} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Line>
)
export const IconMore = (p: IconProps) => (
  <Solid {...p}>
    <circle cx="12" cy="5.5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="18.5" r="1.8" />
  </Solid>
)
export const IconX = (p: IconProps) => (
  <Line strokeWidth={2.2} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Line>
)
export const IconCheck = (p: IconProps) => (
  <Line strokeWidth={2.4} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Line>
)
export const IconTrash = (p: IconProps) => (
  <Line strokeWidth={2.2} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Line>
)
export const IconFlag = (p: IconProps) => (
  <Line strokeWidth={2.2} {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h11l-2 4 2 4H5" />
  </Line>
)
export const IconHeart = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.3 0 5.7 3.1 4.5 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
  </Solid>
)
export const IconHeartLine = (p: IconProps) => (
  <Line strokeWidth={2.1} {...p}>
    <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.7 1.1-1.6 2.7-2.7 4.7-2.7 3.3 0 5.7 3.1 4.5 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
  </Line>
)
export const IconTack = (p: IconProps) => (
  <Solid {...p}>
    <path d="M14 3l7 7-3 1-4 4 .5 4.5L13 21l-4-4-5 5-1-1 5-5-4-4 1.5-1.5L10 11l4-4z" />
  </Solid>
)
export const IconClock = (p: IconProps) => (
  <Line strokeWidth={2.2} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Line>
)
export const IconCamera = (p: IconProps) => (
  <Line strokeWidth={2} {...p}>
    <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Line>
)
export const IconImage = (p: IconProps) => (
  <Line strokeWidth={2} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="2" />
    <path d="M21 16l-5-5-9 9" />
  </Line>
)
export const IconSparkle = (p: IconProps) => (
  <Solid {...p}>
    <path d="M12 2.5l2 6.6 6.5 2.4-6.5 2.4-2 6.6-2-6.6-6.5-2.4 6.5-2.4z" />
  </Solid>
)
export const IconChevronDown = (p: IconProps) => (
  <Line strokeWidth={2.2} {...p}>
    <path d="M6 9l6 6 6-6" />
  </Line>
)
export const IconPeople = (p: IconProps) => (
  <Line strokeWidth={2} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c1-3.6 3.5-5.5 6.5-5.5s5.5 1.9 6.5 5.5" />
    <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.4.8 2.4 2.5 3 5.2" />
  </Line>
)
