import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { IconPencil, IconTrash, PopMenu, useConfirm } from '@/components/story'
import { questionSubmitError, useDeleteQuestion } from '@/features/questions/write'
import { toApiError } from '@/lib/api'

/** 내 질문 상단의 ⋮ 메뉴 — 수정 · 삭제 (F2-07). 삭제에 실패하면 onError로 문구를 넘긴다 */
export function QuestionOwnerMenu({ questionId, onError }: { questionId: number; onError: (message: string | null) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useDeleteQuestion(questionId)
  const confirm = useConfirm()

  async function handleDelete() {
    if (!(await confirm({ title: '질문을 삭제할까요?', description: '답장도 함께 숨겨지고, 되돌릴 수 없어요.', confirmLabel: '삭제', danger: true }))) return
    onError(null)
    remove.mutate(undefined, {
      onSuccess: leave,
      onError: (error) => {
        const apiError = toApiError(error)
        // 이미 지워졌거나 숨겨졌으면 지운 것과 같다
        if (apiError.code === 'NOT_FOUND') leave()
        else onError(questionSubmitError(apiError))
      },
    })
  }

  function leave() {
    // 지금 화면이 다시 부르지 않게 낡음 표시만. 나중에 다시 열면 404 → 없는 글 안내
    queryClient.invalidateQueries({ queryKey: ['questions', 'detail', questionId], refetchType: 'none' })
    navigate('/questions', { replace: true })
  }

  return (
    <PopMenu
      label="질문 메뉴 열기"
      actions={[
        { label: '편지 고치기', icon: <IconPencil />, onSelect: () => navigate(`/questions/${questionId}/edit`) },
        { label: '삭제', icon: <IconTrash />, danger: true, onSelect: () => !remove.isPending && handleDelete() },
      ]}
    />
  )
}
