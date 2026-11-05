import { useState, type FormEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMe } from '@/features/auth/session'
import { safeNextPath, useLogin } from '@/features/auth/useAuthActions'
import { NETWORK_ERROR, toApiError } from '@/lib/api'

/** 에러 code → 화면 문구 (S01) */
function loginErrorMessage(error: unknown): string {
  const e = toApiError(error)
  switch (e.code) {
    case 'LOGIN_FAILED':
      return '아이디나 비밀번호가 맞지 않아요.'
    case 'ACCOUNT_SUSPENDED':
      return '이용이 정지된 계정이에요. 운영진에게 문의해 주세요.'
    case 'LOGIN_LOCKED':
    case 'RATE_LIMITED': {
      const minutes = Math.max(1, Math.ceil((e.retryAfter ?? 60) / 60))
      return `로그인 시도가 너무 많아요. ${minutes}분 뒤에 다시 시도해 주세요.`
    }
    case 'VALIDATION_FAILED':
      return '아이디와 비밀번호를 입력해 주세요.'
    case NETWORK_ERROR:
      return '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
    default:
      return '로그인하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
  }
}

export function LoginPage() {
  const { data: me } = useMe()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const login = useLogin()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  const next = safeNextPath(searchParams.get('next'))

  // 이미 로그인했으면 로그인 화면을 보여 주지 않는다 (로그인 성공 직후도 여기로 이동)
  if (me) return <Navigate to={next} replace />

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login.isPending) return
    login.mutate({ loginId: loginId.trim(), password, remember })
  }

  const canSubmit = loginId.trim() !== '' && password !== '' && !login.isPending

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex h-14 max-w-md items-center px-2">
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-lg hover:bg-accent"
          aria-label="뒤로"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="size-6" />
        </button>
      </header>

      <main className="mx-auto max-w-md px-4 pt-6 pb-10">
        <h1 className="text-center">
          <Logo className="text-3xl" />
        </h1>

        <form className="mt-10 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="loginId">아이디</Label>
            <Input
              id="loginId"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              className="h-11 bg-card"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-11 bg-card"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={remember} onCheckedChange={(checked) => setRemember(checked)} />
            로그인 유지
          </Label>

          {login.isError && (
            <p className="text-sm text-destructive" role="alert">
              {loginErrorMessage(login.error)}
            </p>
          )}

          <Button type="submit" size="lg" className="h-11 w-full" disabled={!canSubmit}>
            {login.isPending ? '로그인 중…' : '로그인'}
          </Button>
        </form>

        <nav className="mt-6 flex justify-center gap-3 text-sm text-muted-foreground" aria-label="계정 도움">
          <Link to="/find-login-id">아이디 찾기</Link>
          <span aria-hidden>·</span>
          <Link to="/password-reset">비밀번호를 잊으셨나요?</Link>
        </nav>

        <Link
          to="/signup"
          className="mt-8 block rounded-lg bg-secondary py-3 text-center text-sm font-bold text-secondary-foreground"
        >
          초대 코드로 가입하기
        </Link>
      </main>
    </div>
  )
}
