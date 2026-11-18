import { createContext, useContext, type ReactNode } from 'react'
import type { GhostPose } from './scene'

export interface ConfirmOptions {
  title: ReactNode
  description?: ReactNode
  /** 누르면 진행하는 버튼 글자 (원래 말 그대로) */
  confirmLabel: string
  cancelLabel?: string
  /** 삭제 · 탈퇴처럼 무거운 동작 = 붉은 글자 */
  danger?: boolean
  ghost?: GhostPose
}

export type Ask = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<Ask | null>(null)

export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext)
  if (!ask) throw new Error('ConfirmProvider 안에서만 쓸 수 있어요')
  return ask
}

