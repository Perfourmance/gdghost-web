import { useState, type FormEvent } from 'react'
import { Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { adminErrorMessage, useAdminAssignStaff, useAdminEmailChange, useAdminMembers, useRoutingExport } from '@/features/admin/api'
import { memberStatusLabel } from '@/features/member/labels'
import { todayKst } from '@/features/schedules/calendar'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

/** 내보내기 · 계정 도구 — 라우팅 CSV, 비상용 운영진 지정, 부원 이메일 변경 요청 */
export function AdminToolsPage() {
  const [member, setMember] = useState<PickedMember | null>(null)
  return (
    <div className="space-y-10">
      <ExportSection />
      <section>
        <h2 className="text-base font-bold text-title">계정 도구</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          운영진이 모두 연락이 끊겼을 때나, 로그인도 메일도 안 되는 부원을 도울 때만 써요. 모두 운영 기록에 남아요.
        </p>
        <MemberPicker picked={member} onPick={setMember} />
        {member && (
          <div className="mt-5 space-y-6">
            <StaffForm key={`staff-${member.id}`} member={member} />
            <EmailForm key={`email-${member.id}`} member={member} />
          </div>
        )}
      </section>
    </div>
  )
}

function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function ExportSection() {
  const today = todayKst()
  const [from, setFrom] = useState(daysBefore(today, 29))
  const [to, setTo] = useState(today)
  const exporter = useRoutingExport()

  function download() {
    if (!window.confirm('라우팅 데이터를 내려받을까요? 받을 때마다 운영 기록과 개발자 디스코드에 남아요.')) return
    exporter.mutate({ from, to })
  }

  return (
    <section>
      <h2 className="text-base font-bold text-title">라우팅 데이터 내보내기 (CSV)</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        이름 · 제목 · 본문 없이 id와 숫자만 담겨요. 익명 질문은 부원 id를 비워요. 보낸 시각 기준, 최대 1년.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Input type="date" aria-label="시작일" max={to} className="h-10 bg-card" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        <span className="text-muted-foreground">–</span>
        <Input type="date" aria-label="끝나는 날" min={from} max={today} className="h-10 bg-card" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
      </div>
      <Button className="mt-3 h-11 w-full" disabled={exporter.isPending} onClick={download}>
        <Download aria-hidden />
        {exporter.isPending ? '만드는 중…' : 'CSV 내려받기'}
      </Button>
      {exporter.isError && <p className="mt-2 text-sm text-destructive">{adminErrorMessage(toApiError(exporter.error))}</p>}
      {exporter.isSuccess && <p className="mt-2 text-sm text-brand-text">내려받았어요.</p>}
    </section>
  )
}

interface PickedMember {
  id: number
  label: string
}

const ROLE_LABELS: Record<string, string> = { STAFF: '운영진', DEV: '개발자' }

/** 부원 고르기 — 이름 · 닉네임 · 아이디로 찾는다. 비우면 최근 가입순. 숨긴 · 정지된 부원도 나온다 */
function MemberPicker({ picked, onPick }: { picked: PickedMember | null; onPick: (m: PickedMember | null) => void }) {
  const [text, setText] = useState('')
  const q = useDebouncedValue(text.trim(), 300)
  const list = useAdminMembers(q || null)
  const items = list.data?.items ?? []

  if (picked) {
    return (
      <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-soft px-4 py-3 text-sm">
        <span className="text-brand-text">
          대상: <b>{picked.label}</b>
        </span>
        <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => onPick(null)}>
          바꾸기
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          aria-label="부원 찾기"
          maxLength={50}
          placeholder="이름 · 닉네임 · 아이디로 찾기"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {q ? `${list.data?.total ?? 0}명` : '최근 가입순'} · 목록에서 숨긴 부원과 정지된 부원도 나와요
      </p>
      {list.isPending && <Skeleton className="mt-2 h-32 w-full rounded-xl" />}
      {list.isError && <p className="mt-2 text-sm text-destructive">부원을 불러오지 못했어요.</p>}
      {list.isSuccess && items.length === 0 && <p className="mt-2 text-sm text-muted-foreground">찾지 못했어요.</p>}
      {items.length > 0 && (
        <ul className={cn('mt-2 divide-y rounded-xl bg-card', list.isPlaceholderData && 'opacity-60')}>
          {items.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-accent"
                onClick={() => onPick({ id: m.id, label: `${m.nickname} (${m.name})` })}
              >
                <span className="flex items-center gap-1.5">
                  <b className="text-title">{m.nickname}</b>
                  <span className="text-xs text-muted-foreground">{m.name}</span>
                  <span className="ml-auto flex gap-1">
                    {m.suspendedAt && <Tag danger>정지</Tag>}
                    {ROLE_LABELS[m.role] && <Tag>{m.staffTitle ?? ROLE_LABELS[m.role]}</Tag>}
                    {m.hiddenFromList && <Tag>숨김</Tag>}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {m.generation}기 · {memberStatusLabel(m.status)} · @{m.loginId}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Tag({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[11px] font-bold',
        danger ? 'bg-destructive/10 text-destructive' : 'bg-brand-soft text-brand-text',
      )}
    >
      {children}
    </span>
  )
}

function StaffForm({ member }: { member: PickedMember }) {
  const assign = useAdminAssignStaff()
  const [title, setTitle] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (t.length < 2) return
    if (!window.confirm(`${member.label}님을 운영진(${t})으로 지정할까요? 운영진 디스코드에 알림이 가요.`)) return
    assign.mutate({ memberId: member.id, staffTitle: t })
  }

  return (
    <form onSubmit={submit}>
      <h3 className="text-sm font-bold text-title">운영진 지정 (비상용)</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">이미 운영진이면 직함만 바뀌어요. 평소에는 운영 페이지에서 지정해요.</p>
      <div className="mt-2 flex gap-2">
        <Input aria-label="직함" maxLength={10} placeholder="직함 (예: 회장)" className="h-10 bg-card" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit" className="h-10 shrink-0" disabled={assign.isPending || title.trim().length < 2}>
          지정
        </Button>
      </div>
      {assign.isError && <p className="mt-2 text-sm text-destructive">{adminErrorMessage(toApiError(assign.error))}</p>}
      {assign.isSuccess && (
        <p className="mt-2 text-sm text-brand-text">
          {assign.data.nickname}님을 {assign.data.staffTitle}(으)로 지정했어요.
        </p>
      )}
    </form>
  )
}

function EmailForm({ member }: { member: PickedMember }) {
  const change = useAdminEmailChange()
  const [newEmail, setNewEmail] = useState('')
  const [note, setNote] = useState('')
  const [password, setPassword] = useState('')
  const valid = /^\S+@\S+\.\S+$/.test(newEmail.trim()) && note.trim().length >= 5 && password !== ''

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || change.isPending) return
    change.mutate(
      { memberId: member.id, input: { currentPassword: password, newEmail: newEmail.trim(), identityNote: note.trim() } },
      { onSettled: () => setPassword('') },
    )
  }

  const field = 'h-10 bg-card'
  return (
    <form onSubmit={submit}>
      <h3 className="text-sm font-bold text-title">이메일 변경 요청</h3>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        로그인도 메일도 안 되는 부원만. 새 메일로 확인 링크(24시간)가 가고, 부원이 링크를 열어야 바뀌어요. 이전 메일에도 안내가 가요.
      </p>
      <div className="mt-2 space-y-2">
        <Input type="email" aria-label="새 이메일" placeholder="새 이메일" className={field} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        <Input
          aria-label="본인 확인 메모"
          maxLength={100}
          placeholder="본인 확인 방법 (5자 이상, 예: 학생증 대면 확인)"
          className={field}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Input type="password" aria-label="내 비밀번호" autoComplete="current-password" placeholder="내 비밀번호" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className={cn('mt-2 h-10 w-full')} disabled={!valid || change.isPending}>
        {change.isPending ? '보내는 중…' : '확인 링크 보내기'}
      </Button>
      {change.isError && <p className="mt-2 text-sm text-destructive">{adminErrorMessage(toApiError(change.error))}</p>}
      {change.isSuccess && (
        <p className="mt-2 text-sm text-brand-text">새 메일로 확인 링크를 보냈어요. {formatDateTime(change.data.expiresAt)}까지 열 수 있어요.</p>
      )}
    </form>
  )
}
