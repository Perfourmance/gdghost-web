import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { useLogout } from '@/features/auth/useAuthActions'
import { PushPanel } from '@/features/push/PushPanel'
import { EmailChangeSheet, PasswordChangeSheet, WithdrawalSheet } from '@/features/me/AccountSheets'
import {
  COFFEE_MEMO_MAX,
  useMyProfile,
  useUpdateSettings,
  type MyProfile,
  type MySettings,
} from '@/features/me/api'
import { toApiError } from '@/lib/api'
import { formatMonthDay } from '@/lib/time'
import { commonErrorMessage } from '@/lib/errorMessage'

type SheetName = 'password' | 'email' | 'withdrawal'

/**
 * 설정 (S62). 받기 설정은 바꾸는 즉시 저장.
 */
export function SettingsPage() {
  const { data: me } = useMe()
  const location = useLocation()
  const profile = useMyProfile(me != null)

  if (!me) {
    return (
      <SubPageLayout>
        <LockPanel next={location.pathname} title="설정은 로그인 후에 볼 수 있어요" />
      </SubPageLayout>
    )
  }

  return (
    <SubPageLayout fallback="/">
      <h1 className="text-[22px] leading-snug font-bold text-title">설정</h1>
      {profile.isPending && (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}
      {profile.isError && (
        <div className="py-16 text-center">
          <p className="text-sm">설정을 불러오지 못했어요.</p>
          <Button variant="secondary" className="mt-3" onClick={() => profile.refetch()}>
            다시 시도
          </Button>
        </div>
      )}
      {profile.data && <SettingsBody profile={profile.data} refetchProfile={() => profile.refetch()} />}
    </SubPageLayout>
  )
}

function SettingsBody({ profile, refetchProfile }: { profile: MyProfile; refetchProfile: () => void }) {
  const { data: me } = useMe()
  const navigate = useNavigate()
  const logout = useLogout()
  const [sheet, setSheet] = useState<SheetName | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function done(message: string) {
    setSheet(null)
    setNotice(message)
  }

  const emailLockedUntil = profile.emailChangeAvailableAt

  return (
    <div className="pb-12">
      {notice && (
        <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-text" role="status">
          {notice}
        </p>
      )}

      <Group title="프로필">
        <LinkRow to={`/members/${profile.id}`} label="내 프로필 보기" />
        <LinkRow to="/profile/edit" label="프로필 수정" />
      </Group>

      {me?.role === 'STAFF' && (
        <Group title="운영">
          <LinkRow to="/ops" label="관리" />
        </Group>
      )}

      <Group title="알림">
        <PushPanel serverOn={profile.settings.pushOn} onChange={() => refetchProfile()} />
        <p className="py-3 text-xs leading-relaxed text-muted-foreground">
          디스코드 알림은 디스코드 앱에서 채널을 음소거해 주세요.
        </p>
      </Group>

      <Group title="내 활동">
        <LinkRow to="/coffee-chats" label="내 커피챗" />
        <LinkRow to="/saved-shares" label="저장한 공유" />
      </Group>

      <ReceiveSettings settings={profile.settings} />

      <Group title="계정">
        <Row label="아이디" value={profile.loginId} />
        <Row
          label="이메일"
          value={profile.email}
          hint={emailLockedUntil ? `${formatMonthDay(emailLockedUntil)}부터 다시 바꿀 수 있어요.` : undefined}
          action={
            <Button variant="secondary" size="sm" disabled={emailLockedUntil != null} onClick={() => setSheet('email')}>
              변경
            </Button>
          }
        />
        <Row
          label="비밀번호"
          action={
            <Button variant="secondary" size="sm" onClick={() => setSheet('password')}>
              변경
            </Button>
          }
        />
      </Group>

      <div className="mt-8 space-y-2">
        <Button variant="secondary" className="h-12 w-full" disabled={logout.isPending} onClick={() => logout.mutate()}>
          {logout.isPending ? '로그아웃하는 중…' : '로그아웃'}
        </Button>
        <Button variant="destructive" className="h-12 w-full" onClick={() => setSheet('withdrawal')}>
          탈퇴하기
        </Button>
      </div>

      <PasswordChangeSheet
        open={sheet === 'password'}
        onClose={() => setSheet(null)}
        onDone={() => done('비밀번호를 바꿨어요. 다른 기기에서는 로그아웃됐어요.')}
      />
      <EmailChangeSheet
        open={sheet === 'email'}
        onClose={() => setSheet(null)}
        currentEmail={profile.email}
        onDone={() => done('이메일을 바꿨어요. 다른 기기에서는 로그아웃됐어요.')}
      />
      <WithdrawalSheet
        open={sheet === 'withdrawal'}
        onClose={() => setSheet(null)}
        onDone={() => navigate('/', { replace: true })}
      />
    </div>
  )
}

/** 질문 · 커피챗 받기, 목록에서 숨기기 — 바꾸는 즉시 저장 */
function ReceiveSettings({ settings }: { settings: MySettings }) {
  const update = useUpdateSettings()
  // 커피챗을 켜려면 수락 때 보일 한 줄이 있어야 한다 (서버도 검사)
  const [memoOpen, setMemoOpen] = useState(false)
  const [memo, setMemo] = useState(settings.coffeeMemo ?? '')

  function toggle(patch: Partial<MySettings>) {
    update.mutate(patch)
  }

  function handleCoffee(on: boolean) {
    if (on && !settings.coffeeMemo) {
      setMemoOpen(true)
      return
    }
    toggle({ acceptCoffee: on })
  }

  function saveMemo() {
    const trimmed = memo.trim()
    if (trimmed === '') return
    update.mutate(
      { coffeeMemo: trimmed, ...(memoOpen && !settings.acceptCoffee && { acceptCoffee: true }) },
      { onSuccess: () => setMemoOpen(false) },
    )
  }

  const editingMemo = memoOpen || (settings.acceptCoffee && memo.trim() !== (settings.coffeeMemo ?? ''))

  return (
    <Group title="받기 설정">
      <SwitchRow
        id="acceptQuestion"
        label="질문 받기"
        description="끄면 AI 추천 · 지목 질문이 나에게 오지 않아요."
        checked={settings.acceptQuestion}
        disabled={update.isPending}
        onChange={(on) => toggle({ acceptQuestion: on })}
      />
      <div className="py-3.5">
        <SwitchRow
          id="acceptCoffee"
          label="커피챗 받기"
          description="켜면 다른 부원이 커피챗을 신청할 수 있어요."
          checked={settings.acceptCoffee || memoOpen}
          disabled={update.isPending}
          onChange={handleCoffee}
          bare
        />
        {(settings.acceptCoffee || memoOpen) && (
          <div className="mt-3 rounded-lg bg-background p-3">
            <label htmlFor="coffeeMemo" className="text-xs font-bold text-title">
              수락하면 상대에게 보일 한 줄
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">일정을 잡을 연락 방법을 적어 주세요.</p>
            <Input
              id="coffeeMemo"
              maxLength={COFFEE_MEMO_MAX}
              placeholder="예) 카톡 오픈채팅으로 연락 주세요: open.kakao.com/…"
              className="mt-2 h-11 bg-card"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            {editingMemo && (
              <div className="mt-2 flex justify-end gap-2">
                {memoOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMemoOpen(false)
                      setMemo(settings.coffeeMemo ?? '')
                    }}
                  >
                    취소
                  </Button>
                )}
                <Button size="sm" disabled={memo.trim() === '' || update.isPending} onClick={saveMemo}>
                  {memoOpen ? '저장하고 켜기' : '저장'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <SwitchRow
        id="hiddenFromList"
        label="부원 목록에서 숨기기"
        description="켜면 부원 목록과 선배 추천에서 빠져요. 내가 쓴 글은 그대로 보여요."
        checked={settings.hiddenFromList}
        disabled={update.isPending}
        onChange={(on) => toggle({ hiddenFromList: on })}
      />
      {update.isError && (
        <p className="pb-3 text-sm text-destructive" role="alert">
          {settingsErrorMessage(toApiError(update.error))}
        </p>
      )}
    </Group>
  )
}

function settingsErrorMessage(error: ReturnType<typeof toApiError>): string {
  if (error.code === 'VALIDATION_FAILED') return '커피챗을 받으려면 상대에게 보일 한 줄을 적어 주세요.'
  return commonErrorMessage(error)
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-bold text-muted-foreground">{title}</h2>
      <div className="divide-y rounded-xl bg-card px-4">{children}</div>
    </section>
  )
}

function LinkRow({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between py-3.5 text-sm text-foreground">
      {label}
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </Link>
  )
}

function Row({ label, value, hint, action }: { label: string; value?: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {value && <p className="mt-0.5 truncate text-xs text-muted-foreground">{value}</p>}
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
  bare,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: (on: boolean) => void
  /** 바깥 칸이 여백을 가질 때 */
  bare?: boolean
}) {
  return (
    <div className={bare ? 'flex items-center justify-between gap-3' : 'flex items-center justify-between gap-3 py-3.5'}>
      <div>
        <label htmlFor={id} className="text-sm text-foreground">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}
