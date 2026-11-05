import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { questionCategoryLabel, questionStateLabel, scheduleKindLabel, shareCategoryLabel } from '@/features/content/labels'
import type { HomePinnedNotice, HomeSchedule, HomeShare } from '@/features/home/useHome'
import { authorName, type Author } from '@/features/member/author'
import { formatDayRange, formatRelative } from '@/lib/time'
import { cn } from '@/lib/utils'

/** 카드를 누르면 — 부원은 상세로, 비회원은 잠금 안내 */
export interface CardTarget {
  member: boolean
  onLocked: (path: string) => void
}

const cardClass = 'block w-full rounded-xl bg-card px-4 py-3.5 text-left transition-colors hover:bg-accent active:bg-accent'

function CardLink({ to, target, children }: { to: string; target: CardTarget; children: ReactNode }) {
  if (target.member) {
    return (
      <Link to={to} className={cardClass}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cardClass} onClick={() => target.onLocked(to)}>
      {children}
    </button>
  )
}

/** 메타 줄 — 가운데 점으로 구분 (디자인 가이드 4장) */
function Meta({ items }: { items: (string | null | undefined | false)[] }) {
  const shown = items.filter(Boolean) as string[]
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      {shown.map((item, i) => (
        <span key={`${i}-${item}`} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>·</span>}
          {item}
        </span>
      ))}
    </p>
  )
}

function CategoryLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold text-brand-text">{children}</p>
}

function Title({ children }: { children: ReactNode }) {
  return <p className="mt-1 line-clamp-2 text-[15px] leading-snug font-bold text-title">{children}</p>
}

export function NoticeCard({ notice, target }: { notice: HomePinnedNotice; target: CardTarget }) {
  return (
    <CardLink to={`/notices/${notice.id}`} target={target}>
      <div className="flex items-center gap-2">
        {notice.isMustRead && (
          <span className="shrink-0 rounded bg-brand px-1.5 py-0.5 text-[11px] font-bold text-white">필독</span>
        )}
        <p className="line-clamp-1 flex-1 text-[15px] font-bold text-title">{notice.title}</p>
        {notice.read === false && <span className="size-2 shrink-0 rounded-full bg-brand" aria-label="안 읽음" />}
      </div>
    </CardLink>
  )
}

/** 질문 카드에 필요한 값 — 홈 · 질문 목록이 같이 쓴다. 부원에게만 오는 값은 선택 */
export interface QuestionCardData {
  id: number
  category: string
  title: string
  author: Author
  createdAt: string
  answerCount: number
  state?: string
  answererPreview?: Author[]
  viewCount?: number
}

/** "테스트선배 외 1명" */
function answererText(answerers: Author[] | undefined): string | null {
  if (!answerers?.length) return null
  const first = authorName(answerers[0])
  return answerers.length > 1 ? `${first} 외 ${answerers.length - 1}명 답변` : `${first} 답변`
}

export function QuestionCard({
  question,
  target,
  now,
  showDetails = false,
}: {
  question: QuestionCardData
  target: CardTarget
  now: number
  /** 질문 목록 — 답변자 · 조회수까지 */
  showDetails?: boolean
}) {
  return (
    <CardLink to={`/questions/${question.id}`} target={target}>
      <div className="flex items-start justify-between gap-2">
        <CategoryLabel>{questionCategoryLabel(question.category)}</CategoryLabel>
        {question.state && (
          <span
            className={cn(
              'shrink-0 text-[11px] font-bold',
              question.state === 'WAITING' ? 'text-muted-foreground' : 'text-brand-text',
            )}
          >
            {questionStateLabel(question.state)}
          </span>
        )}
      </div>
      <Title>{question.title}</Title>
      <Meta
        items={[
          authorName(question.author),
          formatRelative(question.createdAt, now),
          `답변 ${question.answerCount}`,
          showDetails && question.viewCount != null && `조회 ${question.viewCount}`,
        ]}
      />
      {showDetails && answererText(question.answererPreview) && (
        <p className="mt-1 text-xs text-brand-text">{answererText(question.answererPreview)}</p>
      )}
    </CardLink>
  )
}

export function ScheduleCard({ schedule, target }: { schedule: HomeSchedule; target: CardTarget }) {
  return (
    <CardLink to={`/schedules/${schedule.id}`} target={target}>
      <div className="flex items-start justify-between gap-2">
        <CategoryLabel>
          {scheduleKindLabel(schedule.kind)}
          {schedule.isOfficial && <span className="ml-1.5 font-normal text-muted-foreground">공식</span>}
        </CategoryLabel>
        {schedule.dDay != null && (
          <span
            className={cn(
              'shrink-0 text-xs font-bold tabular-nums',
              schedule.deadlineSoon ? 'text-brand-text' : 'text-muted-foreground',
            )}
          >
            {schedule.dDay < 0 ? '지남' : schedule.dDay === 0 ? 'D-DAY' : `D-${schedule.dDay}`}
          </span>
        )}
      </div>
      <Title>{schedule.title}</Title>
      <Meta items={[formatDayRange(schedule.startDate, schedule.endDate), schedule.place]} />
    </CardLink>
  )
}

export function ShareCard({ share, target }: { share: HomeShare; target: CardTarget }) {
  return (
    <CardLink to={`/shares/${share.id}`} target={target}>
      <CategoryLabel>{shareCategoryLabel(share.category)}</CategoryLabel>
      <Title>{share.title}</Title>
      {(share.tags?.length || share.saveCount != null) && (
        <Meta
          items={[share.tags?.length ? share.tags.map((t) => `#${t}`).join(' ') : null, share.saveCount != null && `저장 ${share.saveCount}`]}
        />
      )}
    </CardLink>
  )
}

/** 섹션 — 굵은 제목 + 오른쪽 더보기 + 카드 목록 */
export function HomeSection({
  title,
  moreTo,
  children,
}: {
  title: string
  moreTo?: string
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-title">{title}</h2>
        {moreTo && (
          <Link to={moreTo} className="flex items-center text-xs text-muted-foreground hover:text-foreground">
            더보기
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

/** 비어 있을 때 — "없습니다" 대신 다음에 할 일 (기능명세 화면 상태) */
export function EmptyCard({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
      <p>{children}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
