// 백엔드 enum → 화면 이름. 모르는 값은 '기타' (인계 문서 5장)

const QUESTION_CATEGORIES: Record<string, string> = {
  JOB: '취업·채용',
  CAREER: '커리어·이직',
  PATH: '진로 고민',
  CAMPUS: '학교생활',
  STUDY: '기술·공부',
}

const QUESTION_STATES: Record<string, string> = {
  WAITING: '답변 대기',
  ANSWERED: '답변 있음',
  ADOPTED: '채택됨',
}

const SCHEDULE_KINDS: Record<string, string> = {
  CLUB: '동아리',
  ACADEMIC: '학사',
  CONTEST: '공모전',
  JOB: '채용',
}

const RECRUIT_KINDS: Record<string, string> = {
  TAXI: '택시',
  CONTEST: '공모전',
  SUBSCRIPTION: '구독',
  ETC: '기타',
}

// 노션 API 목록 '공유 목록'
const SHARE_CATEGORIES: Record<string, string> = {
  CAREER_PREP: '취업 준비',
  FOOD: '맛집',
  PLACE: '놀 곳',
  TIP: '꿀팁',
  EXTRA: '비교과',
  LECTURE: '강의',
}

// 노션 API 목록 '피드 목록'
const FEED_CATEGORIES: Record<string, string> = {
  DAILY: '일상',
  ACTIVITY: '활동',
  CERT: '인증',
  BRAG: '자랑',
}

/** 고르는 칩 순서 */
export const SHARE_CATEGORY_KEYS = Object.keys(SHARE_CATEGORIES)
export const FEED_CATEGORY_KEYS = Object.keys(FEED_CATEGORIES)

const label = (map: Record<string, string>) => (value: string) => map[value] ?? '기타'

export const questionCategoryLabel = label(QUESTION_CATEGORIES)
export const questionStateLabel = label(QUESTION_STATES)
export const scheduleKindLabel = label(SCHEDULE_KINDS)
export const recruitKindLabel = label(RECRUIT_KINDS)
export const shareCategoryLabel = label(SHARE_CATEGORIES)
export const feedCategoryLabel = label(FEED_CATEGORIES)
