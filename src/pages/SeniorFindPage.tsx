import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import {
  EmptyState,
  FieldError,
  Ghost,
  IconSearch,
  LinedTextarea,
  LoadingDots,
  Paper,
  PaperChips,
  PaperLabel,
  Pill,
  PillLink,
  StampPicker,
  StorySubPage,
} from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { CoffeeChatSheet, type CoffeeTarget } from '@/features/coffee/CoffeeChatSheet'
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
import { cn } from '@/lib/utils'
import '@/styles/members.css'

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
        <LockPanel next={location.pathname} title="선배 찾기는 부원만 쓸 수 있어요." buttonText="로그인하고 선배 찾기" />
      </SubPageLayout>
    )
  }

  return (
    <StorySubPage fallback="/members" className="gh-find">
      <SeniorFinder saved={(location.state as SavedSearch | null) ?? null} />
    </StorySubPage>
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

  const lit = !match.isPending && shown ? Math.min(shown.result.items.length, 3) : 0

  return (
    <div>
      <div className="gh-fh">
        <h1>선배 찾기</h1>
        <p>
          궁금한 걸 적어 주면
          <br />
          답해 줄 선배의 집을 찾아 줄게요.
        </p>
        <Ghost pose="glass" />
      </div>
      {/* 불 꺼진 집 세 채 = 최대 3명. 찾으면 그 수만큼 불이 켜진다 */}
      <div className="gh-frow">
        <div className="gh-fhs" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(i < lit && 'is-lit')}>
              <div className="gh-r" />
              <div className="gh-w">
                <i />
              </div>
            </div>
          ))}
        </div>
        <p>
          맞는 선배 <b>최대 3명</b>의
          <br />
          창문에 불을 켜 드려요
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Paper>
          <PaperLabel aside="하나 골라 주세요">어떤 이야기예요?</PaperLabel>
          <StampPicker
            label="주제"
            error={triedSubmit && category == null}
            value={category}
            onChange={setCategory}
            options={QUESTION_CATEGORIES.map((c) => ({ value: c, label: questionCategoryLabel(c) }))}
          />
          {triedSubmit && category == null && <FieldError>주제를 골라 주세요.</FieldError>}

          <PaperLabel aside="하나만">어느 분야 선배요?</PaperLabel>
          {tags.isPending && <p className="text-sm text-gh-d-sub">분야를 불러오는 중…</p>}
          {tags.isError && (
            <button type="button" className="text-sm text-gh-pine underline" onClick={() => tags.refetch()}>
              분야를 불러오지 못했어요. 다시 시도
            </button>
          )}
          {tags.data && (
            <PaperChips
              label="관심 분야"
              options={tags.data.interests.map((t) => ({ value: t.id, label: t.name }))}
              isOn={(v) => interestId === v}
              onToggle={setInterestId}
            />
          )}
          {triedSubmit && interestId == null && <FieldError>분야를 골라 주세요.</FieldError>}

          <PaperLabel htmlFor="match-text" aside={`${trimmed.length} / ${MATCH_TEXT_MAX}`}>
            무엇이 궁금한가요?
          </PaperLabel>
          <LinedTextarea
            id="match-text"
            rows={3}
            maxLength={MATCH_TEXT_MAX}
            placeholder="예: 인턴 포트폴리오를 어떻게 준비했나요?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {(triedSubmit || trimmed.length > 0) && textInvalid && <FieldError>{MATCH_TEXT_MIN}자 이상 적어 주세요.</FieldError>}
        </Paper>

        <button type="submit" className="gh-go" disabled={match.isPending}>
          <IconSearch />
          {match.isPending ? '선배 집을 찾는 중…' : '선배 집 찾기'}
        </button>
        {match.isError ? (
          <p className="gh-cap2 is-err" role="alert">
            {seniorMatchErrorMessage(toApiError(match.error))}
          </p>
        ) : (
          <p className="gh-cap2">질문에 맞는 선배를 최대 3명까지 추천해요.</p>
        )}
      </form>

      {match.isPending && <LoadingDots className="mt-8" />}

      {!match.isPending && shown && <Results input={shown.input} result={shown.result} />}
    </div>
  )
}

function Results({ input, result }: { input: SeniorMatchInput; result: SeniorMatchResult }) {
  return (
    <section className="gh-fres" aria-live="polite">
      <h2>불이 켜진 집</h2>
      {result.fallback && result.items.length > 0 && <p>지금은 AI 추천을 쓸 수 없어서, 분야와 경험으로 골랐어요.</p>}

      {result.items.length === 0 ? (
        <EmptyState
          pose="glass"
          className="mt-3"
          title="조건에 맞는 선배가 없어요"
          action={
            <PillLink to="/questions/new" state={{ category: input.category, text: input.text } satisfies DirectAskState} className="mt-3">
              질문 띄우기
            </PillLink>
          }
        >
          질문을 띄우면 운영진과 그 분야 선배에게 차례로 알려요.
        </EmptyState>
      ) : (
        result.items.map((c) => <CandidateCard key={c.member.id} candidate={c} input={input} />)
      )}
    </section>
  )
}

/** 후보 카드 — 순위(불 켜진 창문) · 기수 · 근황 · 추천 이유, 프로필 보기 · 질문하기 · 커피챗 신청 */
function CandidateCard({ candidate, input }: { candidate: SeniorCandidate; input: SeniorMatchInput }) {
  const { member } = candidate
  const [coffee, setCoffee] = useState<CoffeeTarget | null>(null)
  const ask: DirectAskState = {
    target: { id: member.id, nickname: member.nickname },
    category: input.category,
    text: input.text,
  }
  return (
    <article className="gh-cand">
      <div className="gh-cand-h">
        <span className="gh-cand-win" aria-label={`${candidate.rank}순위`}>
          {candidate.rank}
        </span>
        <div>
          <small>
            {member.generation}기 · {memberStatusLabel(member.status)} · {positionLabel(member.position)}
          </small>
          <h3>{member.nickname}</h3>
        </div>
      </div>
      {member.statusNote && <p>{member.statusNote}</p>}
      {candidate.reasons.length > 0 && (
        <ul aria-label="추천 이유">
          {candidate.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <div className="gh-cand-acts">
        <PillLink to="/questions/new" state={ask}>
          질문하기
        </PillLink>
        <PillLink to={`/members/${member.id}`} soft>
          프로필 보기
        </PillLink>
        {member.acceptCoffee && (
          <Pill soft onClick={() => setCoffee({ id: member.id, nickname: member.nickname })}>
            커피챗 신청
          </Pill>
        )}
      </div>
      <CoffeeChatSheet target={coffee} onClose={() => setCoffee(null)} />
    </article>
  )
}
