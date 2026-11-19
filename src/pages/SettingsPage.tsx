import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { EmptyState, Ghost, IconBookmark, IconCup, IconTack, Pill, StorySubPage, SwitchRow } from '@/components/story'
import { LockPanel } from '@/features/auth/LockPanel'
import { useMe } from '@/features/auth/session'
import { useLogout } from '@/features/auth/useAuthActions'
import { pushBlockedText, useInstall, usePush } from '@/features/push/push'
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
import '@/styles/common.css'

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
      <LockPanel next={location.pathname} title="로그인하면 설정을 볼 수 있어요." />
    )
  }

  return (
    <StorySubPage fallback="/">
      <h1 className="gh-st-ttl">설정</h1>
      {profile.isPending && [0, 1, 2].map((i) => <div key={i} className="gh-cskel" />)}
      {profile.isError && (
        <div className="px-4 pt-6">
          <EmptyState
            row
            pose="shh"
            title="설정을 불러오지 못했어요"
            action={
              <Pill soft className="mt-2" onClick={() => profile.refetch()}>
                다시 시도
              </Pill>
            }
          />
        </div>
      )}
      {profile.data && <SettingsBody profile={profile.data} refetchProfile={() => profile.refetch()} />}
    </StorySubPage>
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
    <div>
      {notice && (
        <p className="gh-st-note" role="status">
          {notice}
        </p>
      )}

      <div className="gh-tiles">
        <div className="gh-tile is-me">
          <Ghost pose="b" />
          <Link to={`/members/${profile.id}`}>
            <b>내 프로필 보기</b>
            <span>부원들에게 보이는 모습</span>
          </Link>
          <Link to="/profile/edit" className="gh-edit">
            수정
          </Link>
        </div>
        <Link to="/coffee-chats" className="gh-tile">
          <span className="gh-ic">
            <IconCup />
          </span>
          <b>내 커피챗</b>
          <small aria-hidden>›</small>
        </Link>
        <Link to="/saved-shares" className="gh-tile">
          <span className="gh-ic">
            <IconBookmark />
          </span>
          <b>저장한 공유</b>
          <small aria-hidden>›</small>
        </Link>
        {me?.role === 'STAFF' && (
          <Link to="/ops" className="gh-tile">
            <span className="gh-ic">
              <IconTack />
            </span>
            <b>운영 관리</b>
            <small aria-hidden>›</small>
          </Link>
        )}
      </div>

      <h2 className="gh-st-sh">등불 스위치 · 받기 설정</h2>
      <ReceiveSettings settings={profile.settings} />

      <h2 className="gh-st-sh">알림</h2>
      <PushSettings serverOn={profile.settings.pushOn} onChange={refetchProfile} />

      <h2 className="gh-st-sh">열쇠 꾸러미 · 계정</h2>
      <div className="gh-keys">
        <div className="gh-key">
          <div>
            <small>아이디</small>
            <b>{profile.loginId}</b>
          </div>
        </div>
        <div className="gh-key">
          <div>
            <small>이메일</small>
            <b>{profile.email}</b>
            {emailLockedUntil && <span>{formatMonthDay(emailLockedUntil)}부터 다시 바꿀 수 있어요.</span>}
          </div>
          <button type="button" disabled={emailLockedUntil != null} onClick={() => setSheet('email')}>
            변경
          </button>
        </div>
        <div className="gh-key">
          <div>
            <small>비밀번호</small>
            <b>••••••••</b>
          </div>
          <button type="button" onClick={() => setSheet('password')}>
            변경
          </button>
        </div>
      </div>

      <div className="gh-bye">
        <button type="button" disabled={logout.isPending} onClick={() => logout.mutate()}>
          {logout.isPending ? '로그아웃하는 중…' : '로그아웃'}
        </button>
        <button type="button" className="is-del" onClick={() => setSheet('withdrawal')}>
          탈퇴하기
        </button>
      </div>

      <PasswordChangeSheet
        open={sheet === 'password'}
        onClose={() => setSheet(null)}
        onDone={() => done('비밀번호를 바꿨어요. 다른 기기에서는 로그아웃했어요.')}
      />
      <EmailChangeSheet
        open={sheet === 'email'}
        onClose={() => setSheet(null)}
        currentEmail={profile.email}
        onDone={() => done('이메일을 바꿨어요. 다른 기기에서는 로그아웃했어요.')}
      />
      <WithdrawalSheet open={sheet === 'withdrawal'} onClose={() => setSheet(null)} onDone={() => navigate('/', { replace: true })} />
    </div>
  )
}

/** 이 기기 알림 켜기 + 홈 화면에 추가 (PushPanel과 같은 동작, 등불 스위치 모양) */
function PushSettings({ serverOn, onChange }: { serverOn: boolean; onChange: () => void }) {
  const push = usePush()
  const install = useInstall()
  const [installResult, setInstallResult] = useState<'accepted' | 'dismissed' | 'failed' | null>(null)
  const on = push.state === 'on' && serverOn
  const blocked = pushBlockedText(push.state, install.ios, install.installed)

  async function toggle(next: boolean) {
    if (next) await push.turnOn()
    else await push.turnOff()
    onChange()
  }

  return (
    <>
      <div className="gh-sw">
        <SwitchRow
          title="이 기기에서 알림 받기"
          description="답변·댓글·커피챗·공지 알림"
          warning={push.error ?? blocked ?? undefined}
          checked={on}
          disabled={push.state === 'loading' || push.pending || (blocked != null && !on)}
          onChange={(next) => void toggle(next)}
        />
      </div>
      <div className="gh-tip">
        <b>홈 화면에 추가</b> ·{' '}
        {install.installed || installResult === 'accepted' ? (
          installResult === 'accepted' ? '설치했어요. 홈 화면이나 앱 목록에서 GDGhost를 열어 주세요.' : '앱으로 열려 있어요.'
        ) : install.ios ? (
          <>
            사파리 아래쪽 공유 버튼 → <b>홈 화면에 추가</b>를 눌러 주세요.
          </>
        ) : (
          <>
            {installResult === 'dismissed' && '설치를 취소했어요. '}
            {installResult === 'failed' && '설치 창을 열 수가 없어요. '}
            브라우저 메뉴(⋮)에서 <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 눌러 주세요. PC 크롬에서는 주소창 오른쪽 설치 아이콘도 쓸 수 있어요.
          </>
        )}
        {install.canPrompt && !install.installed && installResult !== 'accepted' && (
          <>
            <br />
            <button type="button" onClick={async () => setInstallResult(await install.prompt())}>
              지금 홈 화면에 추가하기
            </button>
          </>
        )}
        <br />
        알림을 끄려면 디스코드 앱에서 해당 채널을 음소거해 주세요.
      </div>
    </>
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
    <div className="gh-sw">
      <SwitchRow
        title="질문 받기"
        description="질문 받기를 끄면 추천이나 지목으로 오는 질문을 받지 않아요."
        checked={settings.acceptQuestion}
        disabled={update.isPending}
        onChange={(on) => toggle({ acceptQuestion: on })}
      />
      <div>
        <SwitchRow
          title="커피챗 받기"
          description="커피챗 받기를 켜면 다른 부원이 내게 신청할 수 있어요."
          checked={settings.acceptCoffee || memoOpen}
          disabled={update.isPending}
          onChange={handleCoffee}
        />
        {(settings.acceptCoffee || memoOpen) && (
          <div className="gh-memo-box">
            <label htmlFor="coffeeMemo">수락하면 상대에게 보일 한 줄</label>
            <p>일정 조율에 쓸 연락 방법</p>
            <input
              id="coffeeMemo"
              maxLength={COFFEE_MEMO_MAX}
              placeholder="예: 카톡 오픈채팅 open.kakao.com/…"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            {editingMemo && (
              <div className="gh-row">
                {memoOpen && (
                  <Pill
                    soft
                    onClick={() => {
                      setMemoOpen(false)
                      setMemo(settings.coffeeMemo ?? '')
                    }}
                  >
                    취소
                  </Pill>
                )}
                <Pill disabled={memo.trim() === '' || update.isPending} onClick={saveMemo}>
                  {memoOpen ? '저장하고 켜기' : '저장'}
                </Pill>
              </div>
            )}
          </div>
        )}
      </div>
      <SwitchRow
        title="내 프로필 숨기기"
        description="부원 목록과 선배 추천에서 내 프로필을 숨겨요. 작성한 글은 그대로 보여요."
        checked={settings.hiddenFromList}
        disabled={update.isPending}
        onChange={(on) => toggle({ hiddenFromList: on })}
      />
      {update.isError && (
        <p className="gh-st-err" role="alert">
          {settingsErrorMessage(toApiError(update.error))}
        </p>
      )}
    </div>
  )
}

function settingsErrorMessage(error: ReturnType<typeof toApiError>): string {
  if (error.code === 'VALIDATION_FAILED') return '커피챗을 받으려면 상대에게 보일 한 줄이 필요해요.'
  return commonErrorMessage(error)
}
