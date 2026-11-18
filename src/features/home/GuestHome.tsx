import { Link } from 'react-router'
import {
  Board,
  Bookmark,
  EmptyState,
  Ghost,
  PostIt,
  Shelf,
  StoryDayTopBar,
} from '@/components/story'
import { DayRetry, LetterCard, PinBoard, PinBookmark, PinCalendar, PinLetter, Stop } from '@/components/day/Day'
import { LockSheet } from '@/features/auth/LockSheet'
import { useLockSheet } from '@/features/auth/useLockSheet'
import { questionCategoryLabel, scheduleKindLabel, shareCategoryLabel } from '@/features/content/labels'
import { useHome, type HomeSchedule } from '@/features/home/useHome'
import { authorName } from '@/features/member/author'
import { colorOf, SHARE_COLORS } from '@/lib/categoryColors'
import { formatRelative, useNowEveryMinute } from '@/lib/time'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function parts(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return { m, d, w: WEEKDAYS[new Date(y, m - 1, d).getDay()] }
}

/** 티켓 머리 — "11.21 - 22" + "토 ~ 일" (써라운드에 en dash가 없어 -, ~) */
function ticketDate(s: HomeSchedule) {
  const a = parts(s.startDate)
  if (!s.endDate || s.endDate === s.startDate) return { day: `${a.m}.${a.d}`, week: a.w }
  const b = parts(s.endDate)
  return { day: a.m === b.m ? `${a.m}.${a.d} - ${b.d}` : `${a.m}.${a.d} - ${b.m}.${b.d}`, week: `${a.w} ~ ${b.w}` }
}

/**
 * 비회원 홈 (S10) — 시안 guest-final '마을 산책길'.
 * 마을 입구(가입 · 로그인) → 점선 산책길: 마을 게시판 · 새로 온 질문 · 다가오는 날 · 많이 담아 간 공유. 누르면 잠금 안내
 */
export function GuestHome() {
  const home = useHome()
  const lock = useLockSheet()
  const now = useNowEveryMinute()
  const data = home.data

  return (
    <div className="pb-24">
      <header className="gh-gate">
        <StoryDayTopBar />
        <div className="gh-hello">
          <h1>구경 오셨군요!</h1>
          <p>
            <b>질문과 일정</b>은 누구나 볼 수 있어요.
            <br />
            <b>답변</b>은 부원이 되면 열려요.
          </p>
        </div>
        <Link to="/signup" className="gh-gate-join">
          초대장으로 가입 ›
        </Link>
        <Ghost pose="door" className="gh-gate-peek" />
      </header>

      <main className="gh-walk">
        {home.isPending && (
          <div className="space-y-3" aria-label="불러오는 중">
            {[0, 1, 2].map((i) => (
              <div key={i} className="gh-day-skeleton" />
            ))}
          </div>
        )}
        {home.isError && <DayRetry onRetry={() => home.refetch()}>마을 소식을 불러오지 못했어요.</DayRetry>}

        {data && (
          <>
            {data.pinnedNotices.length > 0 && (
              <Stop icon={<PinBoard />} title="마을 게시판" sub="운영진 공지">
                <Board day>
                  {data.pinnedNotices.map((n, i) => (
                    <button key={n.id} type="button" className="text-left" onClick={() => lock.open(`/notices/${n.id}`)}>
                      <PostIt small mint={i % 2 === 1}>
                        {n.title}
                      </PostIt>
                    </button>
                  ))}
                </Board>
              </Stop>
            )}

            <Stop icon={<PinLetter />} title="새로 온 질문" moreTo="/questions">
              {data.recentQuestions.length === 0 ? (
                <EmptyState row pose="glass" title="아직 질문이 없어요">
                  첫 질문이 오면 여기 놓아 둘게요.
                </EmptyState>
              ) : (
                <div className="gh-letters">
                  {data.recentQuestions.map((q) => (
                    <LetterCard
                      key={q.id}
                      category={questionCategoryLabel(q.category)}
                      title={q.title}
                      meta={`${authorName(q.author)} · ${formatRelative(q.createdAt, now)}`}
                      answers={q.answerCount}
                      onClick={() => lock.open(`/questions/${q.id}`)}
                    />
                  ))}
                </div>
              )}
            </Stop>

            <Stop icon={<PinCalendar />} title="다가오는 날" moreTo="/schedules">
              {data.upcomingSchedules.length === 0 ? (
                <EmptyState row pose="star" title="다가오는 날이 없어요">
                  새 일정이 뜨면 여기 걸어 둘게요.
                </EmptyState>
              ) : (
                <div className="gh-dtickets">
                  {data.upcomingSchedules.map((s) => {
                    const { day, week } = ticketDate(s)
                    return (
                      <button key={s.id} type="button" className="gh-dticket" onClick={() => lock.open(`/schedules/${s.id}`)}>
                        <div className="gh-dd">
                          {day}
                          <small>{week}</small>
                        </div>
                        <div className="gh-db">
                          <span className="gh-lab is-day">
                            {scheduleKindLabel(s.kind)}
                            {s.isOfficial && ' · 공식'}
                          </span>
                          <h4>{s.title}</h4>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </Stop>

            <Stop icon={<PinBookmark />} title="많이 담아 간 공유" moreTo="/shares">
              {data.popularShares.length === 0 ? (
                <EmptyState row pose="glass" title="이번 주엔 아직 없어요">
                  저장된 글이 생기면 여기 꽂아 둘게요.
                </EmptyState>
              ) : (
                <div className="-mr-[18px] -ml-3.5">
                  <Shelf>
                    {data.popularShares.map((s) => (
                      <Bookmark
                        key={s.id}
                        to={`/shares/${s.id}`}
                        onClick={() => lock.open(`/shares/${s.id}`)}
                        color={colorOf(SHARE_COLORS, s.category)}
                        category={shareCategoryLabel(s.category)}
                        title={s.title}
                        tags={s.tags}
                        saveCount={s.saveCount}
                      />
                    ))}
                  </Shelf>
                </div>
              )}
            </Stop>
          </>
        )}
      </main>

      <LockSheet next={lock.next} onClose={lock.close} />
    </div>
  )
}
