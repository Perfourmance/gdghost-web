import { MoreVertical } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { questionSubmitError, useDeleteQuestion } from '@/features/questions/write'
import { toApiError } from '@/lib/api'

/** 내 질문 상단의 ⋮ 메뉴 — 수정 · 삭제 (F2-07). 삭제에 실패하면 onError로 문구를 넘긴다 */
export function QuestionOwnerMenu({ questionId, onError }: { questionId: number; onError: (message: string | null) => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useDeleteQuestion(questionId)

  function handleDelete() {
    if (!window.confirm('질문을 삭제할까요? 삭제하면 되돌릴 수 없고, 달린 답변도 함께 안 보여요.')) return
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
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-10 items-center justify-center rounded-lg hover:bg-accent"
        aria-label="질문 메뉴 열기"
        disabled={remove.isPending}
      >
        <MoreVertical className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={() => navigate(`/questions/${questionId}/edit`)}>수정</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
