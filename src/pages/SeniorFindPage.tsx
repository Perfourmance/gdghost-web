import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import searchMascot from '@/assets/mascot/search.png'
import { Chip } from '@/components/Chip'
import { FieldLabel } from '@/components/form/StepLayout'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { questionCategoryLabel } from '@/features/content/labels'
import { memberStatusLabel, positionLabel } from '@/features/member/labels'
import { QUESTION_CATEGORIES, type DirectAskState } from '@/features/questions/write'
import {
  MATCH_TEXT_MAX,
  MATCH_TEXT_MIN,
  seniorMatchErrorMessage,
  useSeniorMatch,
  type SeniorCandidate,
  type SeniorMatchInput,
  type SeniorMatchResult,
} from '@/features/routing/api'
import { useTags } from '@/features/tags/useTags'
import { toApiError } from '@/lib/api'

/** 뒤로 와도 결과가 남게 history state에 둔다 (프로필을 보고 돌아오는 흐름) */
interface SavedSearch {
  input: SeniorMatchInput
  result: SeniorMatchResult
}

/** 선배 찾기 (S25) — 분류 + 관심 분야 하나 + 짧은 질문으로 1–3순위 (F3-05). 저장 · 알림 없음 */
export function SeniorFindPage() {
  const { data: me } = useMe()
  const location = useLocation()

  if (!me) {
    return (
      <SubPageLayout fallback="/members">
        <LockPanel next={location.pathname} title="선배 찾기는 부원만 쓸 수 있어요" buttonText="로그인하고 선배 찾기" />
      </SubPageLayout>
    )
  }

  return (
    <SubPageLayout fallback="/members">
      <SeniorFinder saved={(location.state as SavedSearch | null) ?? null} />
    </SubPageLayout>
  )
}

function SeniorFinder({ saved }: { saved: SavedSearch | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const tags = useTags()
  const match = useSeniorMatch()
  const [category, setCategory] = useState<string | null>(saved?.input.category ?? null)
  const [interestId, setInterestId] = useState<number | null>(saved?.input.interestTagId ?? null)
  const [text, setText] = useState(saved?.input.text ?? '')
  const [triedSubmit, setTriedSubmit] = useState(false)

  const trimmed = text.trim()
  const textInvalid = trimmed.length < MATCH_TEXT_MIN
  // 마지막으로 찾은 입력과 결과 — 입력을 고치면 결과는 그대로 두고 다시 찾게 한다
  const shown = match.data && match.variables ? { input: match.variables, result: match.data } : saved

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTriedSubmit(true)
    if (category == null || interestId == null || textInvalid || match.isPending) return
    const input: SeniorMatchInput = { category, interestTagId: interestId, text: trimmed }
    match.mutate(input, {
      onSuccess: (result) => {
        navigate(location.pathname, { replace: true, state: { input, result } satisfies SavedSearch })
      },
    })
  }

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-snug font-bold text-title">선배 찾기</h1>
          <p className="mt-1 text-sm text-muted-foreground">궁금한 걸 적으면 답해 줄 선배를 찾아 드려요</p>
        </div>
        <img src={searchMascot} alt="" className="w-16 shrink-0" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-8">
        <section>
          <FieldLabel>주제</FieldLabel>
          <div className="flex flex-wrap gap-2" role="group" aria-label="주제">
            {QUESTION_CATEGORIES.map((c) => (
              <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>
                {questionCategoryLabel(c)}
              </Chip>
            ))}
          </div>
          {triedSubmit && category == null && <FieldError>주제를 골라 주세요.</FieldError>}
        </section>

        <section>
          <FieldLabel aside="하나만">분야</FieldLabel>
          {tags.isPending && <Skeleton className="h-20 w-full rounded-lg" />}
          {tags.isError && (
            <Button type="button" variant="secondary" onClick={() => tags.refetch()}>
              분야를 불러오지 못했어요. 다시 시도
            </Button>
          )}
          {tags.data && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="관심 분야">
              {tags.data.interests.map((t) => (
                <Chip key={t.id} selected={interestId === t.id} onClick={() => setInterestId(t.id)}>
                  {t.name}
                </Chip>
              ))}
            </div>
          )}
          {triedSubmit && interestId == null && <FieldError>분야를 골라 주세요.</FieldError>}
        </section>

        <section>
          <FieldLabel htmlFor="match-text" aside={`${trimmed.length} / ${MATCH_TEXT_MAX}`}>
            무엇이 궁금한가요?
          </FieldLabel>
          <textarea
            id="match-text"
            rows={3}
            maxLength={MATCH_TEXT_MAX}
            placeholder="인턴 포트폴리오를 어떻게 준비했나요?"
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {(triedSubmit || trimmed.length > 0) && textInvalid && (
            <FieldError>{MATCH_TEXT_MIN}자 이상 적어 주세요.</FieldError>
          )}
        </section>

        <div>
          <Button type="submit" size="lg" className="h-12 w-full" disabled={match.isPending}>
            {match.isPending ? '선배를 찾는 중…' : '선배 찾기'}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">잘 맞는 선배를 3명까지 추천해요.</p>
          {match.isError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {seniorMatchErrorMessage(toApiError(match.error))}
            </p>
          )}
        </div>
      </form>

      {match.isPending && (
        <div className="mt-8 space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!match.isPending && shown && <Results input={shown.input} result={shown.result} />}
    </div>
  )
}

function Results({ input, result }: { input: SeniorMatchInput; result: SeniorMatchResult }) {
  return (
    <section className="mt-10 border-t pt-6" aria-live="polite">
      <h2 className="text-base font-bold text-title">추천 선배</h2>
      {result.fallback && result.items.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">지금은 AI 추천이 잠시 멈춰서, 분야와 경험만 보고 골랐어요.</p>
      )}

      {result.items.length === 0 ? (
        <div className="mt-4 rounded-xl bg-card px-4 py-6 text-center">
          <p className="text-sm text-foreground">맞는 선배를 찾지 못했어요.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            질문을 올려 두면 운영진과 분야가 맞는 선배에게 차례로 알려 드려요.
          </p>
          <Link
            to="/questions/new"
            state={{ category: input.category, text: input.text } satisfies DirectAskState}
            className={buttonVariants({ size: 'lg', className: 'mt-4 h-12 w-full' })}
          >
            질문 올리기
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {result.items.map((c) => (
            <CandidateCard key={c.member.id} candidate={c} input={input} />
          ))}
        </ul>
      )}
    </section>
  )
}

/** 후보 카드 — 순위 · 기수 · 근황 · 추천 이유, 프로필 보기 · 공개로 묻기. 커피챗 신청은 F19 */
function CandidateCard({ candidate, input }: { candidate: SeniorCandidate; input: SeniorMatchInput }) {
  const { member } = candidate
  const ask: DirectAskState = {
    target: { id: member.id, nickname: member.nickname },
    category: input.category,
    text: input.text,
  }
  return (
    <li className="rounded-xl bg-card px-4 py-4">
      <p className="text-xs font-bold text-brand-text">
        {candidate.rank}순위 · {member.generation}기 · {memberStatusLabel(member.status)} · {positionLabel(member.position)}
      </p>
      <p className="mt-1 text-[15px] font-bold text-title">{member.nickname}</p>
      {member.statusNote && <p className="mt-1 line-clamp-2 text-sm text-foreground">{member.statusNote}</p>}
      {candidate.reasons.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1" aria-label="추천 이유">
          {candidate.reasons.map((r) => (
            <li key={r} className="rounded bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand-text">
              {r}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to={`/members/${member.id}`} className={buttonVariants({ variant: 'secondary', className: 'h-10' })}>
          프로필 보기
        </Link>
        <Link to="/questions/new" state={ask} className={buttonVariants({ className: 'h-10' })}>
          질문하기
        </Link>
      </div>
    </li>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-xs text-destructive" role="alert">
      {children}
    </p>
  )
}
