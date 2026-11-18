import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'
import { LinkifiedText } from '@/components/LinkifiedText'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import {
  EmptyState,
  Ghost,
  IconBookmark,
  IconBookmarkFill,
  IconFlag,
  IconPencil,
  IconTrash,
  InputBar,
  Pill,
  PillLink,
  PopMenu,
  RoundSend,
  Scrap,
  StorySubPage,
} from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { shareCategoryLabel } from '@/features/content/labels'
import { AuthorLink } from '@/features/questions/AnswerList'
import type { ReportTarget } from '@/features/reports/api'
import { ReportSheet } from '@/features/reports/ReportSheet'
import {
  NOTE_MAX,
  noteErrorMessage,
  shareSubmitError,
  useCreateShareNote,
  useDeleteShare,
  useDeleteShareNote,
  useShareDetail,
  useToggleSave,
  type ShareDetail,
  type ShareNote,
} from '@/features/shares/api'
import { PhotoGrid } from '@/features/uploads/PhotoGrid'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { toApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'
import { colorOf, SHARE_COLORS } from '@/lib/categoryColors'
import { formatRelative, useNowEveryMinute } from '@/lib/time'
import '@/styles/shares.css'

/** 공유 상세 (S41) — 본문 · 사진 · 태그 · 저장 · 한 줄 덧붙이기. 비회원은 잠금 안내(상세 API가 401) */
export function ShareDetailPage() {
  const { shareId } = useParams()
  const id = Number(shareId)
  const validId = Number.isInteger(id) && id > 0
  const { data: me } = useMe()
  const location = useLocation()
  const detail = useShareDetail(id, validId && me != null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [report, setReport] = useState<ReportTarget | null>(null)

  // #note-{id}로 들어오면 그 한 줄로 내려간다 (알림 · 신고 링크)
  useEffect(() => {
    if (!detail.data || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' })
  }, [detail.data, location.hash])

  if (!me) {
    return (
      <SubPageLayout fallback="/shares">
        <LockPanel next={location.pathname + location.hash} title="공유 글은 부원만 볼 수 있어요." buttonText="로그인하고 글 보기" />
      </SubPageLayout>
    )
  }

  const notFound = !validId || (detail.isError && toApiError(detail.error).code === 'NOT_FOUND')
  const menu = !detail.data ? null : detail.data.mine ? (
    <OwnerMenu shareId={detail.data.id} onError={setActionError} />
  ) : (
    <PopMenu
      label="공유 메뉴 열기"
      actions={[{ label: '신고하기', icon: <IconFlag />, onSelect: () => setReport({ type: 'SHARE', id: detail.data.id }) }]}
    />
  )

  return (
    <StorySubPage
      fallback="/shares"
      right={menu}
      className="gh-shd"
    >
      {actionError && <p className="gh-shd-err" role="alert">{actionError}</p>}
      {notFound && (
        <div className="px-4 pt-6">
          <EmptyState pose="shh" title="책갈피를 찾을 수 없어요" action={<PillLink to="/shares" className="mt-3">공유 목록으로</PillLink>}>
            삭제됐거나 운영진이 숨긴 글이에요.
          </EmptyState>
        </div>
      )}
      {!notFound && detail.isPending && <div className="gh-shskel !h-72" aria-label="불러오는 중" />}
      {!notFound && detail.isError && (
        <div className="px-4 pt-4">
          <EmptyState
            row
            pose="shh"
            title="공유를 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => detail.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {detail.data && <ShareBody share={detail.data} onReport={setReport} />}
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </StorySubPage>
  )
}

function OwnerMenu({ shareId, onError }: { shareId: number; onError: (message: string | null) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useDeleteShare(shareId)

  function leave() {
    queryClient.invalidateQueries({ queryKey: ['shares', 'detail', shareId], refetchType: 'none' })
    navigate('/shares', { replace: true })
  }

  function handleDelete() {
    if (!window.confirm('공유를 삭제할까요? 삭제는 되돌릴 수 없어요.')) return
    onError(null)
    remove.mutate(undefined, {
      onSuccess: leave,
      onError: (e) => {
        const error = toApiError(e)
        if (error.code === 'NOT_FOUND') leave()
        else onError(shareSubmitError(error))
      },
    })
  }

  return (
    <PopMenu
      label="공유 메뉴 열기"
      actions={[
        { label: '고치기', icon: <IconPencil />, onSelect: () => navigate(`/shares/${shareId}/edit`) },
        { label: '삭제', icon: <IconTrash />, danger: true, onSelect: () => !remove.isPending && handleDelete() },
      ]}
    />
  )
}

function ShareBody({ share, onReport }: { share: ShareDetail; onReport: (target: ReportTarget) => void }) {
  const now = useNowEveryMinute()
  const save = useToggleSave(share.id)
  const color = colorOf(SHARE_COLORS, share.category)

  return (
    <article style={{ '--c': color } as CSSProperties}>
      <div className="gh-shd-wrap">
        <div className="gh-shd-bk">
          <span className="gh-cat">{shareCategoryLabel(share.category)}</span>
          <h1>{share.title}</h1>
          <div className="gh-by">
            <AuthorLink author={share.author} className="" />
            {formatRelative(share.createdAt, now)}
            {share.updatedAt && ' · 고침'}
          </div>
          {share.photos.length > 0 && <PhotoGrid photos={share.photos} alt="공유 사진" className="gh-photos" />}
          <LinkifiedText text={share.body} className="gh-body" />
          {share.tags.length > 0 && (
            <ul className="gh-tags">
              {share.tags.map((tag) => (
                <li key={tag}>#{tag}</li>
              ))}
            </ul>
          )}
        </div>
        {/* 리본 = 저장. 눌러서 꽂기 / 빼기 */}
        <button
          type="button"
          className="gh-ribwrap"
          aria-pressed={share.saved}
          aria-label={share.saved ? `저장 취소, 저장 ${share.saveCount}` : `저장하기, 저장 ${share.saveCount}`}
          onClick={() => save.mutate(!share.saved)}
        >
          <span className="gh-rib">
            {share.saved ? <IconBookmarkFill /> : <IconBookmark />}
            <b>{share.saveCount}</b>
          </span>
          <small>{share.saved ? '꽂아 뒀어요' : '눌러서 꽂기'}</small>
        </button>
      </div>
      {save.isError && (
        <p className="gh-shd-err" role="alert">
          {toApiError(save.error).code === 'NOT_FOUND' ? '삭제된 글은 저장할 수 없어요.' : commonErrorMessage(toApiError(save.error))}
        </p>
      )}

      <NoteSection share={share} now={now} onReport={onReport} />
    </article>
  )
}

/** 한 줄 덧붙이기 — 다른 부원이 짧게 보태는 정보 (F6-04) */
function NoteSection({
  share,
  now,
  onReport,
}: {
  share: ShareDetail
  now: number
  onReport: (target: ReportTarget) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const remove = useDeleteShareNote(share.id)

  function handleDelete(note: ShareNote) {
    if (!window.confirm('덧붙인 한 줄을 삭제할까요?')) return
    setError(null)
    remove.mutate(note.id, { onError: (e) => setError(noteErrorMessage(toApiError(e))) })
  }

  return (
    <section>
      <h2 className="gh-shd-sh">
        한 줄 덧붙이기<em>{share.notes.length}</em>
      </h2>
      {error && <p className="gh-shd-err !mt-0 !mb-3" role="alert">{error}</p>}
      {share.notes.length === 0 ? (
        <div className="gh-nempty">
          <Ghost pose="glass" />
          <b>아직 붙은 쪽지가 없어요</b>
          <span>아는 팁이 있다면 한 줄 보태 주세요.</span>
        </div>
      ) : (
        <ul className="gh-notes">
          {share.notes.map((note) => (
            <li key={note.id} id={`note-${note.id}`} className="scroll-mt-20">
              <Scrap
                name={
                  <AuthorLink
                    className=""
                    author={{ id: note.author.id ?? undefined, nickname: note.author.nickname, withdrawn: note.author.id == null }}
                  />
                }
                mine={note.mine}
                meta={formatRelative(note.createdAt, now)}
                actions={
                  <button
                    type="button"
                    className="is-dim"
                    disabled={remove.isPending}
                    onClick={() => (note.mine ? handleDelete(note) : onReport({ type: 'SHARE_NOTE', id: note.id }))}
                  >
                    {note.mine ? '삭제' : '신고'}
                  </button>
                }
              >
                {note.body}
              </Scrap>
            </li>
          ))}
        </ul>
      )}
      <NoteForm shareId={share.id} />
    </section>
  )
}

function NoteForm({ shareId }: { shareId: number }) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useCreateShareNote(shareId)
  const keyFor = useIdempotencyKey()
  const trimmed = body.trim()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || create.isPending) return
    setError(null)
    create.mutate(
      { body: trimmed, key: keyFor({ shareId, body: trimmed }) },
      { onSuccess: () => setBody(''), onError: (err) => setError(noteErrorMessage(toApiError(err))) },
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p className="gh-nerr" role="alert">
          {error}
        </p>
      )}
      <InputBar
        note
        count={`${body.length} / ${NOTE_MAX}`}
        send={<RoundSend label="쪽지 붙이기" disabled={!trimmed || create.isPending} />}
      >
        <input
          aria-label="덧붙일 한 줄"
          maxLength={NOTE_MAX}
          placeholder="예: 주말엔 웨이팅 30분 있어요"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </InputBar>
    </form>
  )
}
