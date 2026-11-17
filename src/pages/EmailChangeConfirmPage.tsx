import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { StepFooter, StepHeader } from '@/components/form/StepLayout'
import { SubPageLayout } from '@/components/layout/SubPageLayout'
import { Button, buttonVariants } from '@/components/ui/button'
import { confirmEmailChange } from '@/features/account/api'
import { meQueryKey } from '@/features/auth/session'
import { toApiError, type ApiError } from '@/lib/api'
import { commonErrorMessage } from '@/lib/errorMessage'

function errorMessage(e: ApiError): string {
  switch (e.code) {
    case 'RESET_TOKEN_INVALID':
    case 'VALIDATION_FAILED':
      return '이 링크는 사용할 수 없어요. 운영진에게 새 링크를 요청해 주세요.'
    case 'EMAIL_ALREADY_USED':
      return '이미 등록된 이메일이에요. 운영진에게 다른 주소로 변경을 요청해 주세요.'
    default:
      return commonErrorMessage(e)
  }
}

/**
 * 이메일 변경 확인 (S04 · F1-12) — 개발자가 어드민에서 요청한 변경을 새 메일의 링크로 반영한다.
 * 메일 보안 검사기가 링크를 미리 열어도 반영되지 않게 버튼을 눌러야 보낸다
 */
export function EmailChangeConfirmPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const queryClient = useQueryClient()

  const confirm = useMutation({
    mutationFn: () => confirmEmailChange(token),
    // 그 부원의 모든 기기가 로그아웃된다 — 이 기기의 로그인 상태를 다시 확인
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  })

  if (confirm.isSuccess) {
    return (
      <SubPageLayout>
        <StepHeader
          eyebrow="이메일 변경"
          title="이메일이 바뀌었어요"
          description="새 이메일로 비밀번호를 다시 설정해 주세요."
        />
        <div className="space-y-2">
          <Link to="/password-reset" replace className={buttonVariants({ size: 'lg', className: 'h-12 w-full' })}>
            비밀번호 재설정하기
          </Link>
          <Link to="/" replace className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'h-12 w-full' })}>
            홈으로
          </Link>
        </div>
      </SubPageLayout>
    )
  }

  return (
    <SubPageLayout>
      <StepHeader
        eyebrow="이메일 변경"
        title="이 이메일로 바꿀까요?"
        description="이메일 변경을 확인하면 모든 기기에서 로그아웃돼요."
      />

      {!token && (
        <p className="text-sm text-destructive" role="alert">
          가장 최근에 받은 이메일에서 링크를 열어 주세요.
        </p>
      )}
      {confirm.isError && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage(toApiError(confirm.error))}
        </p>
      )}

      <StepFooter>
        <Button
          size="lg"
          className="h-12 w-full"
          disabled={!token || confirm.isPending}
          onClick={() => confirm.mutate()}
        >
          {confirm.isPending ? '확인 중…' : '이메일 변경 확인'}
        </Button>
      </StepFooter>
    </SubPageLayout>
  )
}
