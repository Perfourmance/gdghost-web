// 분류 색 — 어느 화면에서나 같은 값 (디자인 가이드 4-2). 키는 백엔드 enum 값
// 시안에 없던 값(공유 '강의', 포지션 OTHER)은 같은 팔레트에서 골랐다 → design/gdghost/CLAUDE.md에 기록

const FALLBACK = '#93A1BC'

export const SCHEDULE_COLORS: Record<string, string> = {
  CLUB: '#A9C7FF',
  ACADEMIC: '#7FD1C0',
  CONTEST: '#F2A7C3',
  JOB: '#C7B2FF',
}

export const SHARE_COLORS: Record<string, string> = {
  CAREER_PREP: '#A9C7FF',
  FOOD: '#F4A38A',
  PLACE: '#7FD1C0',
  TIP: '#E9D58A',
  EXTRA: '#C7B2FF',
  LECTURE: '#F2A7C3',
}

export const FEED_COLORS: Record<string, string> = {
  DAILY: '#7FD1C0',
  ACTIVITY: '#A9C7FF',
  CERT: '#E9D58A',
  BRAG: '#F4A38A',
}

/** 부원 집 지붕 = 분야 */
export const ROOF_COLORS: Record<string, string> = {
  DEV: '#3B57C9',
  AI: '#2F6E73',
  DESIGN: '#4A4F5C',
  ETC: '#7A6A4F',
}

/** 운영 상태 칩: 대기 앰버 · 승인 민트 · 반려 붉은 */
export const REVIEW_COLORS: Record<string, string> = {
  PENDING: '#F5B952',
  APPROVED: '#7FD1C0',
  REJECTED: '#F08A7A',
}

export const colorOf = (map: Record<string, string>, key: string | null | undefined) =>
  (key && map[key]) || FALLBACK
