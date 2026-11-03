import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NewPasswordFields } from '@/components/form/NewPasswordFields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { switchSession } from '@/features/auth/session'
import { completeSignup, type SignupRequest } from '@/features/signup/api'
import { SIGNUP_STEP_LABELS, type SignupDraft, type SignupStep } from '@/features/signup/draft'
import { isPasswordValid } from '@/lib/passwordRules'
import { StepFooter, StepHeader } from '@/components/form/StepLayout'
import { useLoginIdCheck } from '@/features/signup/useLoginIdCheck'
import { toApiError, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

interface Props {
  draft: SignupDraft
  /** 다른 단계의 값을 고쳐야 할 때 그 단계로 보낸다 */
  onRedirect: (step: SignupStep, message: string, patch?: Partial<SignupDraft>) => void
  /** 가입 토큰이 끝났을 때 — 초대 코드부터 다시 */
  onRestart: (message: string) => void
  /** 가입 성공 직전 — 보관한 입력값을 지운다 */
  onFinished: () => void
}

/** 서버가 준 칸 이름 → 그 칸이 있는 단계 */
function stepOfField(field: string): SignupStep | null {
  if (field.startsWith('profile.interestTagIds') || field.startsWith('profile.skillTagIds')) return 'interests'
  if (field.startsWith('profile.experienceTagIds')) return 'experiences'
  if (field.startsWith('profile.statusNote') || field.startsWith('profile.bio')) return 'about'
  if (field.startsWith('profile.')) return 'profile'
  return null
}

function buildRequest(draft: SignupDraft, loginId: string, password: string): SignupRequest | null {
  const { basic, answerable, signupToken } = draft
  if (!signupToken || !basic || !answerable || !basic.position || !basic.status) return null
  return {
    signupToken,
    loginId,
    password,
    profile: {
      name: basic.name.trim(),
      nickname: basic.nickname.trim(),
      position: basic.position,
      studentNo: basic.studentNo,
      department: basic.department.trim(),
      status: basic.status,
      interestTagIds: answerable.interestTagIds,
      skillTagIds: answerable.skillTagIds,
      experienceTagIds: answerable.experienceTagIds,
      statusNote: answerable.statusNote.trim() || null,
      bio: answerable.bio.trim() || null,
    },
  }
}

/** ⑦ 아이디 · 비밀번호 → POST /auth/signup. 성공하면 바로 로그인돼 다크 홈으로 */
export function AccountStep({ draft, onRedirect, onRestart, onFinished }: Props) {
  const queryClient = useQueryClient()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const loginIdCheck = useLoginIdCheck(loginId)

  const signup = useMutation({
    mutationFn: completeSignup,
    onSuccess: (me) => {
      onFinished()
      switchSession(queryClient, me)
    },
    onError: (error) => handleError(toApiError(error)),
  })

  function handleError(e: ApiError) {
    switch (e.code) {
      case 'LOGIN_ID_TAKEN':
        setErrorMessage('그사이 다른 사람이 이 아이디로 가입했어요. 다른 아이디를 써 주세요.')
        return
      case 'PASSWORD_POLICY':
        setErrorMessage('비밀번호는 8자 이상, 영문 · 숫자 · 특수문자를 모두 넣어 주세요.')
        return
      case 'NICKNAME_TAKEN':
        onRedirect('profile', '그사이 다른 사람이 이 닉네임을 쓰기 시작했어요. 다른 닉네임을 정해 주세요.')
        return
      case 'NICKNAME_RESERVED':
        onRedirect('profile', "'익명'으로 시작하는 닉네임은 쓸 수 없어요. 닉네임을 바꿔 주세요.")
        return
      case 'EMAIL_ALREADY_USED':
        onRedirect('email', '이미 가입된 이메일이에요. 다른 이메일로 다시 인증해 주세요.', {
          emailVerified: false,
          codeSentTo: undefined,
          resendAvailableAt: undefined,
        })
        return
      case 'SIGNUP_SESSION_EXPIRED':
        onRestart('가입 시간(30분)이 지났어요. 초대 코드부터 다시 입력해 주세요.')
        return
      case 'INVITE_CODE_INVALID':
        onRestart('초대 코드를 더 쓸 수 없어요. 운영진에게 새 코드를 받아 처음부터 다시 해 주세요.')
        return
      case 'VALIDATION_FAILED': {
        const field = e.fieldErrors.find((f) => stepOfField(f.field) != null)
        if (field) {
          onRedirect(stepOfField(field.field)!, field.message)
          return
        }
        setErrorMessage(e.fieldErrors[0]?.message ?? '입력한 내용을 확인해 주세요.')
        return
      }
      default:
        setErrorMessage(commonErrorMessage(e))
    }
  }

  const passwordValid = isPasswordValid(password)
  const canSubmit =
    loginIdCheck.state === 'available' && passwordValid && passwordConfirm === password && !signup.isPending

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    const request = buildRequest(draft, loginId.trim(), password)
    if (!request) {
      onRedirect('profile', '프로필 입력이 빠졌어요. 다시 확인해 주세요.')
      return
    }
    setErrorMessage('')
    signup.mutate(request)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepHeader
        eyebrow={SIGNUP_STEP_LABELS.account}
        title="아이디와 비밀번호를 정해 주세요"
        description="마지막 단계예요. 로그인은 이메일이 아니라 아이디로 해요."
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="font-bold text-title" htmlFor="loginId">
            아이디
          </Label>
          <Input
            id="loginId"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={16}
            className="h-12 bg-card"
            aria-describedby="loginId-help"
            aria-invalid={loginIdCheck.state === 'invalid'}
            value={loginId}
            onChange={(e) => setLoginId(e.target.value.replace(/\s/g, ''))}
          />
          <p id="loginId-help" className="text-sm" aria-live="polite">
            {loginIdCheck.state === 'empty' && <span className="text-muted-foreground">영문 · 숫자 4–16자</span>}
            {loginIdCheck.state === 'checking' && <span className="text-muted-foreground">확인 중…</span>}
            {loginIdCheck.state === 'available' && <span className="text-brand-text">사용할 수 있어요.</span>}
            {loginIdCheck.state === 'invalid' && <span className="text-destructive">{loginIdCheck.message}</span>}
            {loginIdCheck.state === 'error' && (
              <span className="text-destructive">확인하지 못했어요. 잠시 뒤 다시 입력해 주세요.</span>
            )}
          </p>
        </div>

        <NewPasswordFields
          password={password}
          confirm={passwordConfirm}
          onPasswordChange={setPassword}
          onConfirmChange={setPasswordConfirm}
        />

        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      <StepFooter>
        <Button type="submit" size="lg" className="h-12 w-full" disabled={!canSubmit}>
          {signup.isPending ? '가입하는 중…' : '가입하기'}
        </Button>
      </StepFooter>
    </form>
  )
}
