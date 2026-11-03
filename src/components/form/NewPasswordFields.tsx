import { Check, Circle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hasWhitespace, PASSWORD_RULES } from '@/lib/passwordRules'
import { cn } from '@/lib/utils'

interface Props {
  password: string
  confirm: string
  onPasswordChange: (value: string) => void
  onConfirmChange: (value: string) => void
  label?: string
}

/** 새 비밀번호 + 확인 — 규칙을 입력하면서 ✓로 보여 준다 (가입 · 비밀번호 재설정 · 변경에서 같이 씀) */
export function NewPasswordFields({ password, confirm, onPasswordChange, onConfirmChange, label = '비밀번호' }: Props) {
  const confirmMismatch = confirm !== '' && confirm !== password

  return (
    <>
      <div className="space-y-2">
        <Label className="font-bold text-title" htmlFor="newPassword">
          {label}
        </Label>
        <Input
          id="newPassword"
          name="new-password"
          type="password"
          autoComplete="new-password"
          maxLength={64}
          className="h-12 bg-card"
          aria-describedby="password-rules"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
        />
        <ul id="password-rules" className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="비밀번호 규칙">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password)
            return (
              <li
                key={rule.label}
                className={cn('flex items-center gap-1', ok ? 'font-bold text-brand-text' : 'text-muted-foreground')}
              >
                {ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3" aria-hidden />}
                {rule.label}
                <span className="sr-only">{ok ? ' 충족' : ' 미충족'}</span>
              </li>
            )
          })}
        </ul>
        {hasWhitespace(password) && <p className="text-sm text-destructive">공백은 넣을 수 없어요.</p>}
      </div>

      <div className="space-y-2">
        <Label className="font-bold text-title" htmlFor="newPasswordConfirm">
          {label} 확인
        </Label>
        <Input
          id="newPasswordConfirm"
          type="password"
          autoComplete="new-password"
          maxLength={64}
          className="h-12 bg-card"
          aria-invalid={confirmMismatch}
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
        />
        {confirmMismatch && <p className="text-sm text-destructive">비밀번호가 서로 달라요.</p>}
      </div>
    </>
  )
}
