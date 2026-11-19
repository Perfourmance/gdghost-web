import { useState, type FormEvent, type ReactNode } from 'react'
import { FieldError, StoryButton, StorySheet, type GhostPose } from '@/components/story'
import { PasswordRuleDots } from '@/features/signup/SignupParts'
import {
  emailChangeErrorMessage,
  passwordChangeErrorMessage,
  useChangePassword,
  useConfirmEmailChange,
  useSendEmailChangeCode,
  useWithdraw,
  withdrawalErrorMessage,
} from '@/features/me/api'
import { useSecondsUntil } from '@/hooks/useSecondsUntil'
import { toApiError } from '@/lib/api'
import { EMAIL_PATTERN } from '@/lib/emailErrors'
import { hasWhitespace, isPasswordValid } from '@/lib/passwordRules'
import '@/styles/common.css'
import '@/styles/day.css'

// 설정 화면 위에 뜨는 시트 — 비밀번호 변경 · 이메일 변경 · 탈퇴 (IA 3장 시트)

function AccountSheet({
  open,
  onClose,
  title,
  description,
  ghost = 'shh',
  bubble,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  ghost?: GhostPose
  bubble?: string
  children: ReactNode
}) {
  return (
    <StorySheet open={open} onOpenChange={(next) => !next && onClose()} ghost={ghost} bubble={bubble} title={title} description={description}>
      {/* 닫으면 입력값을 비운다 (비밀번호가 메모리에 남지 않게) */}
      {open && children}
    </StorySheet>
  )
}

function CurrentPasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="gh-sf">
      <label htmlFor="currentPassword">현재 비밀번호</label>
      <input
        id="currentPassword"
        type="password"
        autoComplete="current-password"
        maxLength={64}
        className="gh-sin"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function ErrorText({ children }: { children: ReactNode }) {
  return <FieldError>{children}</FieldError>
}

/** 새 비밀번호 + 확인 (밤 시트) — 규칙 4개를 입력하면서 민트 ✓ */
function NightNewPassword({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
}: {
  password: string
  confirm: string
  onPasswordChange: (v: string) => void
  onConfirmChange: (v: string) => void
}) {
  const mismatch = confirm !== '' && confirm !== password
  return (
    <>
      <div className="gh-sf">
        <label htmlFor="newPassword">새 비밀번호</label>
        <input
          id="newPassword"
          name="new-password"
          type="password"
          autoComplete="new-password"
          maxLength={64}
          className="gh-sin"
          aria-describedby="password-rules"
          aria-invalid={hasWhitespace(password)}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
        />
        <PasswordRuleDots id="password-rules" password={password} />
        {hasWhitespace(password) && <small className="is-bad">공백은 넣을 수 없어요.</small>}
      </div>
      <div className="gh-sf">
        <label htmlFor="newPasswordConfirm">새 비밀번호 확인</label>
        <input
          id="newPasswordConfirm"
          type="password"
          autoComplete="new-password"
          maxLength={64}
          className="gh-sin"
          aria-invalid={mismatch}
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
        />
        {mismatch && <small className="is-bad">두 비밀번호가 달라요.</small>}
      </div>
    </>
  )
}

/** 비밀번호 변경 — 이 기기는 로그인 유지, 다른 기기는 로그아웃 */
export function PasswordChangeSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  return (
    <AccountSheet open={open} onClose={onClose} ghost="lantern" bubble="새 열쇠를 만들어요" title="비밀번호 바꾸기" description="바꾸면 다른 기기에서 로그아웃돼요.">
      <PasswordChangeForm onDone={onDone} />
    </AccountSheet>
  )
}

function PasswordChangeForm({ onDone }: { onDone: () => void }) {
  const change = useChangePassword()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const canSubmit = current !== '' && isPasswordValid(password) && confirm === password && !change.isPending

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canSubmit) change.mutate({ currentPassword: current, newPassword: password }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <CurrentPasswordField value={current} onChange={setCurrent} />
      <NightNewPassword password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} />
      {change.isError && <ErrorText>{passwordChangeErrorMessage(toApiError(change.error))}</ErrorText>}
      <StoryButton type="submit" disabled={!canSubmit}>
        {change.isPending ? '바꾸는 중…' : '비밀번호 바꾸기'}
      </StoryButton>
    </form>
  )
}

/** 이메일 변경 — 현재 비밀번호 + 새 메일 → 인증번호 → 확인. 30일에 한 번 */
export function EmailChangeSheet({
  open,
  onClose,
  onDone,
  currentEmail,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
  currentEmail: string
}) {
  return (
    <AccountSheet
      open={open}
      onClose={onClose}
      ghost="b"
      bubble="우편함을 옮겨요"
      title="이메일 바꾸기"
      description="계정 찾기에 쓰는 이메일이에요. 바꾸면 30일 동안 다시 바꿀 수 없어요."
    >
      <EmailChangeForm currentEmail={currentEmail} onDone={onDone} />
    </AccountSheet>
  )
}

function EmailChangeForm({ currentEmail, onDone }: { currentEmail: string; onDone: () => void }) {
  const send = useSendEmailChangeCode()
  const confirm = useConfirmEmailChange()
  const [current, setCurrent] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  // 인증번호를 보낸 메일 · 다시 보낼 수 있는 시각. 메일을 고치면 다시 받아야 한다
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const resendWait = useSecondsUntil(resendAt)

  const trimmed = email.trim()
  const sameAsCurrent = trimmed.toLowerCase() === currentEmail.toLowerCase()
  const codeSent = sentTo != null && sentTo === trimmed
  const canSend = current !== '' && EMAIL_PATTERN.test(trimmed) && !sameAsCurrent && !send.isPending && resendWait === 0
  const canConfirm = codeSent && /^\d{6}$/.test(code) && !confirm.isPending

  function handleSend() {
    if (!canSend) return
    confirm.reset()
    send.mutate(
      { currentPassword: current, newEmail: trimmed },
      {
        onSuccess: (res) => {
          setSentTo(trimmed)
          setResendAt(new Date(res.resendAvailableAt).getTime())
        },
      },
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canConfirm) confirm.mutate({ newEmail: trimmed, code }, { onSuccess: onDone })
  }

  const error = confirm.isError ? confirm.error : send.isError ? send.error : null

  return (
    <form onSubmit={handleSubmit} noValidate>
      <CurrentPasswordField value={current} onChange={setCurrent} />

      <div className="gh-sf">
        <label htmlFor="newEmail">새 이메일</label>
        <div className="gh-sf-row">
          <input id="newEmail" type="email" autoComplete="email" maxLength={254} className="gh-sin" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="button" disabled={!canSend} onClick={handleSend}>
            {send.isPending ? '보내는 중…' : resendWait > 0 && codeSent ? `${resendWait}초` : codeSent ? '다시 받기' : '인증번호 받기'}
          </button>
        </div>
        <small>지금 메일: {currentEmail}</small>
        {sameAsCurrent && trimmed !== '' && <small className="is-bad">지금 쓰는 이메일이에요</small>}
        {codeSent && (
          <small className="is-ok" role="status">
            인증번호를 보냈어요. 10분 안에 입력해 주세요.
          </small>
        )}
      </div>

      {codeSent && (
        <div className="gh-sf">
          <label htmlFor="emailCode">인증번호 6자리</label>
          <input
            id="emailCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="gh-sin is-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </div>
      )}

      {error && <ErrorText>{emailChangeErrorMessage(toApiError(error), sameAsCurrent)}</ErrorText>}

      {codeSent && (
        <StoryButton type="submit" disabled={!canConfirm}>
          {confirm.isPending ? '확인하는 중…' : '이메일 바꾸기'}
        </StoryButton>
      )}
    </form>
  )
}

/** 탈퇴 확인 — 비밀번호를 한 번 더. 성공하면 비회원 홈으로 */
export function WithdrawalSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  return (
    <AccountSheet open={open} onClose={onClose} ghost="shh" bubble="정말 떠나요?" title="정말 탈퇴할까요?">
      <WithdrawalForm onDone={onDone} />
    </AccountSheet>
  )
}

function WithdrawalForm({ onDone }: { onDone: () => void }) {
  const withdraw = useWithdraw()
  const [password, setPassword] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== '' && !withdraw.isPending) withdraw.mutate(password, { onSuccess: onDone })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ul className="gh-bye-list">
        <li>질문·답변·공유글은 남고, 작성자는 ‘탈퇴한 부원’으로 표시돼요.</li>
        <li>피드 글, 프로필, 연락 수단은 삭제돼요.</li>
        <li>탈퇴하면 계정을 복구할 수 없어요.</li>
      </ul>
      <CurrentPasswordField value={password} onChange={setPassword} />
      {withdraw.isError && <ErrorText>{withdrawalErrorMessage(toApiError(withdraw.error))}</ErrorText>}
      <StoryButton type="submit" tone="glass" className="gh-danger" disabled={password === '' || withdraw.isPending}>
        {withdraw.isPending ? '탈퇴하는 중…' : '탈퇴하기'}
      </StoryButton>
    </form>
  )
}
