import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Menu } from '@base-ui/react/menu'
import { cn } from '@/lib/utils'
import { StoryButton } from './Buttons'
import { ConfirmContext, type Ask, type ConfirmOptions } from './confirm'
import { Ghost } from './Ghost'
import type { GhostPose } from './scene'
import { IconCheck, IconMore, IconX } from './icons'

/* ── 빈 상태 ─────────────────────────────── */

/** 처리할 것 없음 — 점선 상자 + 민트 체크 + 한 줄 (운영 등) */
export function Calm({ children }: { children: ReactNode }) {
  return (
    <div className="gh-calm">
      <i aria-hidden>
        <IconCheck />
      </i>
      {children}
    </div>
  )
}

/** 빈 상태 — 점선 상자 + 유령 + 제목 · 한 줄 (+ 동작). row = 작은 가로형 */
export function EmptyState({
  pose = 'glass',
  title,
  children,
  action,
  row,
  className,
}: {
  pose?: GhostPose
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  row?: boolean
  className?: string
}) {
  return (
    <div className={cn('gh-empty', row && 'is-row', className)}>
      <Ghost pose={pose} />
      <div>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
        {action}
      </div>
    </div>
  )
}

/** 기다리는 중 — 앰버 점 3개 (움직임 줄이기 설정이면 멈춤) */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('gh-loading-dots', className)} role="status" aria-label="불러오는 중">
      {[0, 1, 2].map((i) => (
        <i key={i} className="loading-dot" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

/* ── 시트 ────────────────────────────────── */

interface StorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** 유령 + 말풍선 (밤) */
  ghost?: GhostPose
  bubble?: ReactNode
  /** 낮 시트 = 노을 띠 + 물결 종이 + 문 유령 */
  day?: boolean
  kicker?: ReactNode
  children?: ReactNode
}

/** 아래에서 올라오는 시트. 뒤 화면은 흐리게 */
export function StorySheet({ open, onOpenChange, title, description, ghost, bubble, day, kicker, children }: StorySheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[rgba(6,13,29,0.6)] backdrop-blur-[5px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            'gh-sheet fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md outline-none transition-transform duration-200 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full',
            day && 'is-day',
          )}
        >
          {day ? (
            <>
              <div className="gh-dusk" aria-hidden>
                <span className="gh-sun" />
              </div>
              <Dialog.Close className="gh-x" aria-label="닫기">
                <IconX />
              </Dialog.Close>
              <div className="gh-wave">
                <Ghost pose={ghost ?? 'door'} className="gh-door" />
                {kicker && <span className="gh-kicker">{kicker}</span>}
                <Dialog.Title render={<h2 />}>{title}</Dialog.Title>
                {description && <Dialog.Description className="gh-sheet-sub">{description}</Dialog.Description>}
                {children}
              </div>
            </>
          ) : (
            <>
              <span className="gh-grab" aria-hidden />
              <Dialog.Close className="gh-x" aria-label="닫기">
                <IconX />
              </Dialog.Close>
              {ghost && (
                <div className="gh-sheet-head">
                  <Ghost pose={ghost} />
                  {bubble && <span className="gh-bubble">{bubble}</span>}
                </div>
              )}
              <Dialog.Title render={<h2 />}>{title}</Dialog.Title>
              {description && <Dialog.Description className="gh-sheet-sub">{description}</Dialog.Description>}
              {children}
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ── 확인 창 (window.confirm 대신) ─────────── */

/** 앱 맨 위에 한 번 둔다. useConfirm()으로 시트를 띄우고 true / false를 받는다 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [open, setOpen] = useState(false)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const ask = useCallback<Ask>((next) => {
    resolver.current?.(false)
    setOptions(next)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const finish = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpen(false)
  }

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {options && (
        <StorySheet
          open={open}
          onOpenChange={(next) => !next && finish(false)}
          title={options.title}
          description={options.description}
          ghost={options.ghost ?? (options.danger ? 'shh' : 'b')}
        >
          <div className="gh-sheet-actions">
            <StoryButton tone="glass" onClick={() => finish(false)}>
              {options.cancelLabel ?? '취소'}
            </StoryButton>
            <StoryButton tone={options.danger ? 'glass' : 'blue'} className={cn(options.danger && 'gh-danger')} onClick={() => finish(true)}>
              {options.confirmLabel}
            </StoryButton>
          </div>
        </StorySheet>
      )}
    </ConfirmContext.Provider>
  )
}

/* ── 메뉴(⋮) ─────────────────────────────── */

export interface MenuAction {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
}

/** ⋮ 유리 팝업. 삭제는 붉게 */
export function PopMenu({ actions, label = '메뉴 열기' }: { actions: MenuAction[]; label?: string }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="gh-nb" aria-label={label}>
        <IconMore />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-none" align="end" sideOffset={6}>
          <Menu.Popup className="gh-menu">
            {actions.map((a) => (
              <Menu.Item key={a.label} className={cn('gh-menu-item', a.danger && 'is-danger')} onClick={a.onSelect}>
                {a.icon}
                {a.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/* ── 등불 ────────────────────────────────── */

/** 토글 — 켜짐 = 앰버 (등불이 켜짐) */
export function Toggle({
  checked,
  onChange,
  disabled,
  small,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  small?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cn('gh-toggle', small && 'is-small')}
      onClick={() => onChange(!checked)}
    />
  )
}

/** 등불 스위치 줄 — 왼쪽 작은 등불 + 이름 · 설명 + 오른쪽 토글 */
export function SwitchRow({
  title,
  description,
  warning,
  checked,
  onChange,
  disabled,
}: {
  title: string
  description?: ReactNode
  warning?: ReactNode
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={cn('gh-switchrow', checked && 'is-on')}>
      <span className="gh-lamp" aria-hidden />
      <div className="gh-st">
        <b>{title}</b>
        {description && <span>{description}</span>}
        {warning && <span className="gh-warn">{warning}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  )
}

/** 이름 붙은 등불 줄 (프로필 완성도). 누르면 그 칸으로 */
export function LanternRow({ items }: { items: { label: string; on: boolean; current?: boolean; onClick?: () => void }[] }) {
  return (
    <div className="gh-lrow" style={{ '--n': items.length } as CSSProperties}>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          className={cn(!it.on && 'is-off', it.current && 'is-current')}
          aria-label={`${it.label} ${it.on ? '채움' : '비어 있음'}`}
          onClick={it.onClick}
        >
          <i aria-hidden />
          {it.label}
        </button>
      ))}
    </div>
  )
}

/** 등불 지표 칸 (운영) — 손볼 게 있는 칸만 앰버로 켜짐 */
export function LampStat({ label, value, unit, lit }: { label: string; value: ReactNode; unit?: string; lit?: boolean }) {
  return (
    <div className={cn('gh-lp', lit && 'is-lit')}>
      <small>{label}</small>
      <b>
        {value}
        {unit && <span>{unit}</span>}
      </b>
    </div>
  )
}

export function LampGrid({ columns = 3, children }: { columns?: number; children: ReactNode }) {
  return (
    <div className="gh-lamps" style={{ '--n': columns } as CSSProperties}>
      {children}
    </div>
  )
}
