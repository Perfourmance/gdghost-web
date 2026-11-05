import { useState } from 'react'
import { Share, SquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { usePush, useInstall, type PushState } from '@/features/push/push'

/** 켤 수 없을 때의 안내 */
function blockedText(state: PushState, ios: boolean, installed: boolean): string | null {
  switch (state) {
    case 'unsupported':
      return ios && !installed
        ? '아이폰은 홈 화면에 추가한 앱에서 알림을 받을 수 있어요. 아래에서 먼저 추가해 주세요.'
        : '이 브라우저는 알림을 받을 수 없어요.'
    case 'no-worker':
      return '지금 화면에서는 알림을 켤 수 없어요. 배포된 주소에서 다시 시도해 주세요.'
    case 'no-key':
      return '서버에 알림 설정이 아직 없어요. (로컬 서버)'
    case 'denied':
      return '브라우저에서 알림을 막아 두었어요. 브라우저 설정 → 사이트 설정에서 알림을 허용해 주세요.'
    default:
      return null
  }
}

/**
 * 이 기기 알림 켜기 · 끄기 + 홈 화면에 추가 (F8-04). 가입 끝 알림 준비와 설정이 함께 쓴다.
 * serverOn: 설정의 pushOn — 모든 기기를 꺼 두었으면 이 기기 구독이 남아 있어도 꺼짐으로 보인다
 */
export function PushPanel({ serverOn = true, onChange }: { serverOn?: boolean; onChange?: () => void }) {
  const push = usePush()
  const install = useInstall()
  const [installResult, setInstallResult] = useState<'accepted' | 'dismissed' | 'failed' | null>(null)
  const on = push.state === 'on' && serverOn
  const blocked = blockedText(push.state, install.ios, install.installed)

  async function toggle(next: boolean) {
    if (next) await push.turnOn()
    else await push.turnOff()
    onChange?.()
  }

  return (
    <div className="divide-y">
      <div className="py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label htmlFor="push-on" className="text-sm text-foreground">
              이 기기에서 알림 받기
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">답변 · 댓글 · 커피챗 · 공지 알림이 와요.</p>
          </div>
          <Switch
            id="push-on"
            checked={on}
            disabled={push.state === 'loading' || push.pending || (blocked != null && !on)}
            onCheckedChange={toggle}
          />
        </div>
        {blocked && <p className="mt-2 text-xs text-muted-foreground">{blocked}</p>}
        {push.error && (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {push.error}
          </p>
        )}
      </div>

      <div className="py-3.5">
        <p className="text-sm text-foreground">홈 화면에 추가</p>
        {install.installed || installResult === 'accepted' ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {installResult === 'accepted' ? '설치했어요. 홈 화면(또는 앱 목록)에서 GDGhost를 열어 보세요.' : '앱으로 열려 있어요.'}
          </p>
        ) : install.canPrompt ? (
          <>
            <p className="mt-0.5 text-xs text-muted-foreground">앱처럼 바로 열 수 있어요.</p>
            <Button variant="secondary" size="sm" className="mt-2" onClick={async () => setInstallResult(await install.prompt())}>
              <SquarePlus aria-hidden />
              홈 화면에 추가
            </Button>
          </>
        ) : install.ios ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            사파리 아래쪽 <Share className="inline size-3.5 align-[-2px]" aria-label="공유" /> 공유 버튼 →{' '}
            <b className="text-foreground">홈 화면에 추가</b>를 눌러 주세요.
          </p>
        ) : (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {installResult === 'dismissed' && '설치를 취소했어요. '}
            {installResult === 'failed' && '설치 창을 띄우지 못했어요. '}
            브라우저 메뉴(⋮)에서 <b className="text-foreground">홈 화면에 추가</b> 또는{' '}
            <b className="text-foreground">앱 설치</b>를 눌러 주세요. 컴퓨터 크롬은 주소창 오른쪽 설치 아이콘으로도 할 수 있어요.
          </p>
        )}
      </div>
    </div>
  )
}
