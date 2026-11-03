import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import door from '@/assets/mascot/door.png'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockSheet } from '@/features/auth/LockSheet'
import { useMe } from '@/features/auth/session'
import { useLockSheet } from '@/features/auth/useLockSheet'
import {
  EmptyCard,
  HomeSection,
  NoticeCard,
  QuestionCard,
  ScheduleCard,
  ShareCard,
  type CardTarget,
} from '@/features/content/Cards'
import { useHome } from '@/features/home/useHome'
import { useNowEveryMinute } from '@/lib/time'

/** 홈 (S10) — 모든 접속의 첫 화면. 비회원은 제목까지, 부원은 전부 */
export function HomePage() {
  const { data: me } = useMe()
  const home = useHome()
  const lock = useLockSheet()
  const now = useNowEveryMinute()
  const member = me != null
  const target: CardTarget = { member, onLocked: lock.open }

  return (
    <div className="space-y-8 pb-4">
      {member ? <MustReadBanner count={home.data?.unconfirmedMustReadCount ?? 0} /> : <GuestBanner />}

      {home.isPending && <HomeSkeleton />}

      {home.isError && (
        <div className="space-y-3 rounded-xl bg-card p-5 text-center" role="alert">
          <p className="text-sm text-foreground">홈을 불러오지 못했어요.</p>
          <Button variant="secondary" onClick={() => home.refetch()}>
            다시 시도
          </Button>
        </div>
      )}

      {home.data && (
        <>
          {home.data.pinnedNotices.length > 0 && (
            <HomeSection title="운영진 공지" moreTo={member ? '/notices' : undefined}>
              {home.data.pinnedNotices.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} target={target} />
              ))}
            </HomeSection>
          )}

          <HomeSection title="새 질문" moreTo="/questions">
            {home.data.recentQuestions.length === 0 ? (
              <EmptyCard>아직 질문이 없어요. 첫 질문을 남겨 보세요.</EmptyCard>
            ) : (
              home.data.recentQuestions.map((q) => <QuestionCard key={q.id} question={q} target={target} now={now} />)
            )}
          </HomeSection>

          <HomeSection title="다가오는 일정" moreTo="/schedules">
            {home.data.upcomingSchedules.length === 0 ? (
              <EmptyCard>다가오는 일정이 없어요. 공모전 · 채용 일정을 올려 보세요.</EmptyCard>
            ) : (
              home.data.upcomingSchedules.map((s) => <ScheduleCard key={s.id} schedule={s} target={target} />)
            )}
          </HomeSection>

          <HomeSection title="많이 저장된 공유" moreTo="/shares">
            {home.data.popularShares.length === 0 ? (
              <EmptyCard>이번 주에 저장된 공유가 없어요. 알고 있는 꿀팁을 공유해 보세요.</EmptyCard>
            ) : (
              home.data.popularShares.map((s) => <ShareCard key={s.id} share={s} target={target} />)
            )}
          </HomeSection>
        </>
      )}

      <LockSheet next={lock.next} onClose={lock.close} />
    </div>
  )
}

/** 비회원 — 문 여는 유령 + "둘러보는 중입니다 · 가입" 띠 (IA 2장 · 디자인 가이드 5장) */
function GuestBanner() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-4">
      <img src={door} alt="" className="w-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-title">둘러보는 중입니다</p>
        <p className="mt-0.5 text-xs text-muted-foreground">부원이 되면 질문 · 답변을 모두 볼 수 있어요.</p>
      </div>
      <Link
        to="/signup"
        className="shrink-0 rounded-lg bg-brand-soft px-3 py-2 text-sm font-bold text-brand-text hover:opacity-90"
      >
        가입
      </Link>
    </div>
  )
}

/** 부원 — 확인하지 않은 필독 공지가 있을 때만 */
function MustReadBanner({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <Link to="/notices" className="flex items-center justify-between rounded-xl bg-brand px-4 py-3 text-white">
      <span className="text-sm font-bold">확인하지 않은 필독 공지가 {count}개 있어요</span>
      <ChevronRight className="size-5 shrink-0" aria-hidden />
    </Link>
  )
}

/** 섹션 자리만 비워 둔다 (화면 전체를 막지 않음) */
function HomeSkeleton() {
  return (
    <div className="space-y-8" aria-label="불러오는 중">
      {[0, 1, 2].map((section) => (
        <div key={section} className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}
