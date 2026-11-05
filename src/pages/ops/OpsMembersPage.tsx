import { useState, type FormEvent, type ReactNode } from 'react'
import { GraduationCap, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Chip } from '@/components/Chip'
import { LoadError } from '@/components/PageStates'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe, type Role } from '@/features/auth/session'
import { EmptyCard } from '@/features/content/Cards'
import { MEMBER_STATUSES, memberStatusLabel, type MemberStatus } from '@/features/member/labels'
import {
  opsErrorMessage,
  useAssignStaff,
  useAuditLogs,
  useOpsMembers,
  useRevokeStaff,
  useSuspend,
  useUnsuspend,
  useViewEmail,
  type OpsMember,
} from '@/features/ops/api'
import { Pager } from '@/features/ops/OpsBits'
import { formatDate } from '@/lib/time'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const ROLES: { value: Role; label: string }[] = [
  { value: 'MEMBER', label: '부원' },
  { value: 'STAFF', label: '운영진' },
  { value: 'DEV', label: '개발자' },
]
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? '기타'

/** 운영 기록 이름 (OpsAction) */
const ACTIONS: Record<string, string> = {
  EMAIL_VIEW: '이메일 열람',
  EMAIL_CHANGE_REQUEST: '이메일 변경 요청',
  SUSPEND: '계정 정지',
  UNSUSPEND: '정지 해제',
  STAFF_ASSIGN: '운영진 지정',
  STAFF_REVOKE: '운영진 해제',
  INVITE_CODE_ISSUE: '초대 코드 발급',
  INVITE_CODE_REVOKE: '초대 코드 폐기',
  REPORT_HIDE: '신고 · 숨김',
  REPORT_RESTORE: '숨김 되돌림',
  REPORT_DISMISS: '신고 · 괜찮음',
  CERT_REVIEW: '인증 검토',
  GRADUATE: '졸업 처리',
  ROUTING_EXPORT: '라우팅 내보내기',
  SCHEDULE_EDIT: '일정 수정',
  SCHEDULE_DELETE: '일정 삭제',
}

/** 운영 · 부원 관리 (S73) — 검색 · 필터 · 쪽 번호, 행을 누르면 부원 상세 시트(이메일 · 정지 · 운영진 · 운영 기록) */
export function OpsMembersPage() {
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState(params.get('q') ?? '')
  const q = useDebouncedValue(text.trim(), 400)
  const [selected, setSelected] = useState<OpsMember | null>(null)

  const generation = Number(params.get('generation')) || null
  const status = (MEMBER_STATUSES.find((s) => s.value === params.get('status'))?.value ?? null) as MemberStatus | null
  const role = (ROLES.find((r) => r.value === params.get('role'))?.value ?? null) as Role | null
  const suspended = params.get('suspended') === '1' ? true : null
  const page = Math.max(0, Number(params.get('page')) || 0)

  const list = useOpsMembers({ q: q || null, generation, status, role, suspended, page })

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null) next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const items = list.data?.items ?? []
  // 목록이 바뀌면 시트도 새 값으로
  const current = selected ? (items.find((m) => m.id === selected.id) ?? selected) : null

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="부원 검색"
            maxLength={50}
            placeholder="이름 · 닉네임 · 아이디"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (page) set('page', null)
            }}
            className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
        </div>
        <Link to="/ops/members/graduation" className={buttonVariants({ variant: 'secondary', className: 'h-10' })}>
          <GraduationCap aria-hidden />
          졸업 처리
        </Link>
      </div>

      <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2">
          <Chip selected={suspended === true} onClick={() => set('suspended', suspended ? null : '1')}>
            정지됨
          </Chip>
          {ROLES.map((r) => (
            <Chip key={r.value} selected={role === r.value} onClick={() => set('role', role === r.value ? null : r.value)}>
              {r.label}
            </Chip>
          ))}
          {MEMBER_STATUSES.map((s) => (
            <Chip key={s.value} selected={status === s.value} onClick={() => set('status', status === s.value ? null : s.value)}>
              {s.label}
            </Chip>
          ))}
          <select
            aria-label="기수"
            value={generation ?? ''}
            onChange={(e) => set('generation', e.target.value || null)}
            className="rounded-md border bg-card px-2 py-1.5 text-base md:text-sm"
          >
            <option value="">전체 기수</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g}>
                {g}기
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {list.data ? `${list.data.total}명` : ' '} · 최근 가입순 · 목록에서 숨긴 부원도 보여요
      </p>
      <div className={cn('mt-2 space-y-2', list.isPlaceholderData && 'opacity-60')}>
        {list.isPending && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        {list.isError && <LoadError text="부원을 불러오지 못했어요." onRetry={() => list.refetch()} />}
        {list.isSuccess && items.length === 0 && <EmptyCard>조건에 맞는 부원이 없어요.</EmptyCard>}
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelected(m)}
            className="block w-full rounded-xl bg-card px-4 py-3 text-left transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-title">{m.nickname}</span>
              <span className="text-xs text-muted-foreground">{m.name}</span>
              <span className="ml-auto flex shrink-0 gap-1">
                {m.suspendedAt && <Tag tone="danger">정지</Tag>}
                {m.role !== 'MEMBER' && <Tag tone="brand">{m.staffTitle ?? roleLabel(m.role)}</Tag>}
                {m.hiddenFromList && <Tag>숨김</Tag>}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {m.generation}기 · {memberStatusLabel(m.status)} · @{m.loginId} · 가입 {formatDate(m.joinedAt)}
            </p>
          </button>
        ))}
      </div>
      {list.data && (
        <Pager page={list.data.page} size={list.data.size} total={list.data.total} onChange={(p) => set('page', String(p))} />
      )}

      <MemberSheet member={current} onClose={() => setSelected(null)} />
    </div>
  )
}

function Tag({ children, tone }: { children: ReactNode; tone?: 'brand' | 'danger' }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[11px] font-bold',
        tone === 'brand' ? 'bg-brand-soft text-brand-text' : tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

function MemberSheet({ member, onClose }: { member: OpsMember | null; onClose: () => void }) {
  return (
    <Sheet open={member != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl border-0 bg-card px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {member && <MemberDetail key={member.id} member={member} />}
      </SheetContent>
    </Sheet>
  )
}

type Panel = 'suspend' | 'staff' | null

function MemberDetail({ member }: { member: OpsMember }) {
  const { data: me } = useMe()
  const email = useViewEmail(member.id)
  const suspend = useSuspend(member.id)
  const unsuspend = useUnsuspend(member.id)
  const assign = useAssignStaff(member.id)
  const revoke = useRevokeStaff(member.id)
  const [panel, setPanel] = useState<Panel>(null)
  const [reason, setReason] = useState('')
  const [title, setTitle] = useState(member.staffTitle ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const self = me?.id === member.id
  const isStaff = member.role === 'STAFF'
  const canSuspend = member.role === 'MEMBER' && !self
  const busy = suspend.isPending || unsuspend.isPending || assign.isPending || revoke.isPending

  const onError = (e: unknown) => setError(opsErrorMessage(toApiError(e)))
  const ok = (message: string) => () => {
    setPanel(null)
    setError(null)
    setDone(message)
  }

  function submitSuspend(e: FormEvent) {
    e.preventDefault()
    if (reason.trim().length < 2) return
    suspend.mutate(reason.trim(), { onSuccess: ok('정지했어요. 바로 로그아웃돼요.'), onError })
  }

  function submitStaff(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (t.length < 2) return
    assign.mutate(t, { onSuccess: ok(isStaff ? '직함을 바꿨어요.' : '운영진으로 지정했어요.'), onError })
  }

  function handleRevoke() {
    const message = self ? '나를 운영진에서 해제할까요? 바로 운영 페이지를 쓸 수 없게 돼요.' : `${member.nickname}님을 운영진에서 해제할까요?`
    if (!window.confirm(message)) return
    revoke.mutate(undefined, { onSuccess: ok('운영진에서 해제했어요.'), onError })
  }

  function handleUnsuspend() {
    if (!window.confirm(`${member.nickname}님의 정지를 풀까요?`)) return
    unsuspend.mutate(undefined, { onSuccess: ok('정지를 풀었어요. 다시 로그인할 수 있어요.'), onError })
  }

  return (
    <div>
      <SheetTitle className="text-lg font-bold text-title">
        {member.nickname} <span className="text-sm font-normal text-muted-foreground">{member.name}</span>
      </SheetTitle>
      <SheetDescription className="mt-1 text-xs text-muted-foreground">
        {member.generation}기 · {memberStatusLabel(member.status)} · {member.staffTitle ?? roleLabel(member.role)} · @{member.loginId}
      </SheetDescription>

      <dl className="mt-4 grid grid-cols-[5rem_1fr] gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">가입</dt>
        <dd>{formatDate(member.joinedAt)}</dd>
        <dt className="text-muted-foreground">마지막 접속</dt>
        <dd>{formatDate(member.lastSeenAt)}</dd>
        {member.suspendedAt && (
          <>
            <dt className="text-muted-foreground">정지</dt>
            <dd className="text-destructive">{formatDate(member.suspendedAt)}부터</dd>
          </>
        )}
        <dt className="text-muted-foreground">이메일</dt>
        <dd>
          {email.data ? (
            <span className="break-all">{email.data}</span>
          ) : (
            <button
              type="button"
              disabled={email.isPending}
              onClick={() => email.mutate()}
              className="font-bold text-brand-text hover:underline disabled:opacity-50"
            >
              보기
            </button>
          )}
          <span className="ml-1 text-xs text-muted-foreground">(볼 때마다 운영 기록에 남아요)</span>
        </dd>
      </dl>
      {email.isError && <p className="mt-1 text-sm text-destructive">{opsErrorMessage(toApiError(email.error))}</p>}

      <Link
        to={`/members/${member.id}`}
        className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-4' })}
      >
        프로필 보기
      </Link>

      {done && (
        <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text" role="status">
          {done}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* 운영진 지정 · 해제 · 직함 — 개발자 · 정지된 계정은 지정할 수 없다 */}
      <section className="mt-6 border-t pt-4">
        <h3 className="text-sm font-bold text-title">운영진</h3>
        {member.role === 'DEV' ? (
          <p className="mt-1 text-xs text-muted-foreground">개발자 계정은 운영진으로 지정할 수 없어요.</p>
        ) : member.suspendedAt ? (
          <p className="mt-1 text-xs text-muted-foreground">정지된 계정은 운영진으로 지정할 수 없어요.</p>
        ) : panel === 'staff' ? (
          <form onSubmit={submitStaff} className="mt-2 flex gap-2">
            <Input
              aria-label="직함"
              autoFocus
              minLength={2}
              maxLength={10}
              placeholder="예) 회장, 운영진"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 bg-background"
            />
            <Button type="submit" className="h-10 shrink-0" disabled={busy || title.trim().length < 2}>
              {isStaff ? '바꾸기' : '지정'}
            </Button>
            <Button type="button" variant="ghost" className="h-10 shrink-0" onClick={() => setPanel(null)}>
              취소
            </Button>
          </form>
        ) : (
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => setPanel('staff')}>
              {isStaff ? '직함 바꾸기' : '운영진으로 지정'}
            </Button>
            {isStaff && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={handleRevoke}>
                {self ? '나를 해제' : '운영진 해제'}
              </Button>
            )}
          </div>
        )}
        {isStaff && <p className="mt-1.5 text-xs text-muted-foreground">마지막 운영진은 해제할 수 없어요.</p>}
      </section>

      {/* 정지 — 운영진 · 개발자 · 나에게는 없다 */}
      {(canSuspend || member.suspendedAt) && (
        <section className="mt-5 border-t pt-4">
          <h3 className="text-sm font-bold text-title">계정 정지</h3>
          {member.suspendedAt ? (
            <Button variant="secondary" size="sm" className="mt-2" disabled={busy} onClick={handleUnsuspend}>
              정지 풀기
            </Button>
          ) : panel === 'suspend' ? (
            <form onSubmit={submitSuspend} className="mt-2">
              <textarea
                aria-label="정지 사유"
                autoFocus
                rows={2}
                maxLength={200}
                placeholder="사유(운영진끼리만 봐요, 2자 이상)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-base outline-none md:text-sm"
              />
              <div className="mt-2 flex gap-2">
                <Button type="submit" variant="destructive" size="sm" disabled={busy || reason.trim().length < 2}>
                  정지하기
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPanel(null)}>
                  취소
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">바로 로그아웃되고 다시 로그인할 수 없어요. 쓴 글은 그대로 남아요.</p>
            </form>
          ) : (
            <Button variant="secondary" size="sm" className="mt-2" disabled={busy} onClick={() => setPanel('suspend')}>
              정지하기
            </Button>
          )}
        </section>
      )}

      <AuditSection memberId={member.id} />
    </div>
  )
}

function AuditSection({ memberId }: { memberId: number }) {
  const [page, setPage] = useState(0)
  const logs = useAuditLogs(memberId, page)
  return (
    <section className="mt-5 border-t pt-4">
      <h3 className="text-sm font-bold text-title">운영 기록</h3>
      {logs.isPending && <Skeleton className="mt-2 h-12 w-full" />}
      {logs.isError && <p className="mt-2 text-sm text-destructive">운영 기록을 불러오지 못했어요.</p>}
      {logs.data && logs.data.items.length === 0 && <p className="mt-1 text-xs text-muted-foreground">아직 기록이 없어요.</p>}
      <ul className="mt-2 space-y-1.5">
        {logs.data?.items.map((log) => (
          <li key={log.id} className="text-sm">
            <span className="font-bold text-title">{ACTIONS[log.action] ?? log.action}</span>
            <span className="ml-1.5 text-xs text-muted-foreground">
              {log.actor.nickname ?? '탈퇴한 운영진'} · {formatDate(log.createdAt)}
            </span>
            {log.detail && Object.keys(log.detail).length > 0 && (
              <p className="text-xs break-all text-muted-foreground">
                {Object.entries(log.detail)
                  .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                  .join(' · ')}
              </p>
            )}
          </li>
        ))}
      </ul>
      {logs.data && <Pager page={logs.data.page} size={logs.data.size} total={logs.data.total} onChange={setPage} />}
    </section>
  )
}
