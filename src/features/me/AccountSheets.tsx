import { useState, type FormEvent, type ReactNode } from 'react'
import { NewPasswordFields } from '@/components/form/NewPasswordFields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
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
import { isPasswordValid } from '@/lib/passwordRules'

// 설정 화면 위에 뜨는 시트 — 비밀번호 변경 · 이메일 변경 · 탈퇴 (IA 3장 시트)

function AccountSheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-t-2xl border-0 bg-card px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetTitle className="text-lg font-bold text-title">{title}</SheetTitle>
        {description && (
          <SheetDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</SheetDescription>
        )}
        {/* 닫으면 입력값을 비운다 (비밀번호가 메모리에 남지 않게) */}
        {open && <div className="mt-6">{children}</div>}
      </SheetContent>
    </Sheet>
  )
}

function CurrentPasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="font-bold text-title" htmlFor="currentPassword">
        현재 비밀번호
      </Label>
      <Input
        id="currentPassword"
        type="password"
        autoComplete="current-password"
        maxLength={64}
        className="h-12 bg-background"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-destructive" role="alert">
      {children}
    </p>
  )
}

/** 비밀번호 변경 — 이 기기는 로그인 유지, 다른 기기는 로그아웃 */
export function PasswordChangeSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  return (
    <AccountSheet open={open} onClose={onClose} title="비밀번호 변경" description="바꾸면 이 기기를 뺀 다른 기기에서는 로그아웃돼요.">
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
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <CurrentPasswordField value={current} onChange={setCurrent} />
      <NewPasswordFields
        label="새 비밀번호"
        password={password}
        confirm={confirm}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirm}
      />
      {change.isError && <ErrorText>{passwordChangeErrorMessage(toApiError(change.error))}</ErrorText>}
      <Button type="submit" size="lg" className="h-12 w-full" disabled={!canSubmit}>
        {change.isPending ? '바꾸는 중…' : '비밀번호 바꾸기'}
      </Button>
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
      title="이메일 변경"
      description="아이디 · 비밀번호를 찾을 때 쓰는 메일이에요. 바꾸면 30일 동안 다시 바꿀 수 없어요."
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
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <CurrentPasswordField value={current} onChange={setCurrent} />

      <div className="space-y-2">
        <Label className="font-bold text-title" htmlFor="newEmail">
          새 이메일
        </Label>
        <div className="flex gap-2">
          <Input
            id="newEmail"
            type="email"
            autoComplete="email"
            maxLength={254}
            className="h-12 bg-background"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="button" variant="secondary" className="h-12 shrink-0" disabled={!canSend} onClick={handleSend}>
            {send.isPending ? '보내는 중…' : resendWait > 0 && codeSent ? `${resendWait}초` : codeSent ? '다시 받기' : '인증번호 받기'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">지금 메일: {currentEmail}</p>
        {sameAsCurrent && trimmed !== '' && <p className="text-xs text-destructive">지금 쓰는 이메일이에요.</p>}
        {codeSent && (
          <p className="text-xs text-brand-text" role="status">
            인증번호를 보냈어요(10분 유효). 메일이 안 오면 스팸함을 확인해 주세요.
          </p>
        )}
      </div>

      {codeSent && (
        <div className="space-y-2">
          <Label className="font-bold text-title" htmlFor="emailCode">
            인증번호 6자리
          </Label>
          <Input
            id="emailCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="h-12 bg-background tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </div>
      )}

      {error && <ErrorText>{emailChangeErrorMessage(toApiError(error), sameAsCurrent)}</ErrorText>}

      {codeSent && (
        <Button type="submit" size="lg" className="h-12 w-full" disabled={!canConfirm}>
          {confirm.isPending ? '확인 중…' : '이메일 바꾸기'}
        </Button>
      )}
    </form>
  )
}

/** 탈퇴 확인 — 비밀번호를 한 번 더. 성공하면 비회원 홈으로 */
export function WithdrawalSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  return (
    <AccountSheet open={open} onClose={onClose} title="정말 탈퇴할까요?">
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
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
        <li>남긴 질문 · 답변 · 공유는 지워지지 않고 작성자가 &lsquo;탈퇴한 부원&rsquo;으로 바뀌어요.</li>
        <li>피드 글과 프로필 · 연락 수단은 모두 지워져요.</li>
        <li>탈퇴는 되돌릴 수 없어요.</li>
      </ul>
      <CurrentPasswordField value={password} onChange={setPassword} />
      {withdraw.isError && <ErrorText>{withdrawalErrorMessage(toApiError(withdraw.error))}</ErrorText>}
      <Button type="submit" size="lg" variant="destructive" className="h-12 w-full" disabled={password === '' || withdraw.isPending}>
        {withdraw.isPending ? '탈퇴하는 중…' : '탈퇴하기'}
      </Button>
    </form>
  )
}
