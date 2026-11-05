import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

// 웹 푸시 (백엔드 PushController). 기기마다 구독 하나 — 이 브라우저의 구독을 등록 · 해제한다

/**
 * 이 기기의 알림 상태
 * - unsupported: 브라우저가 못 받음(아이폰은 홈 화면에 추가한 앱에서만 됨)
 * - no-worker: 서비스 워커가 없음(개발 서버 등)
 * - no-key: 서버에 푸시 키가 없음(로컬 백엔드)
 * - denied: 브라우저 알림을 막아 둠
 * - on · off
 */
export type PushState = 'loading' | 'unsupported' | 'no-worker' | 'no-key' | 'denied' | 'on' | 'off'

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** 홈 화면에 추가한 앱으로 열렸는지 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** 서비스 워커가 준비될 때까지 (개발 서버처럼 없으면 null) */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  const existing = await navigator.serviceWorker.getRegistration()
  if (!existing) return null
  return navigator.serviceWorker.ready
}

let keyCache: Promise<string | null> | null = null
function vapidKey(): Promise<string | null> {
  keyCache ??= api
    .get<{ publicKey: string | null }>('/push/vapid-public-key')
    .then((r) => r.data.publicKey)
    .catch((e) => {
      keyCache = null
      throw e
    })
  return keyCache
}

function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function readState(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  const reg = await registration()
  if (!reg) return 'no-worker'
  if (!(await vapidKey())) return 'no-key'
  if (Notification.permission === 'denied') return 'denied'
  const sub = await reg.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

/** 알림 켜기 — 권한을 묻고 구독해 서버에 등록한다(서버가 push_on도 켠다) */
async function subscribe(): Promise<PushState> {
  const reg = await registration()
  const key = await vapidKey()
  if (!reg || !key) return readState()
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) }))
  const json = sub.toJSON()
  await api.post('/me/push-subscriptions', {
    endpoint: sub.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
  })
  return 'on'
}

/** 이 기기만 끈다 */
async function unsubscribe(): Promise<PushState> {
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await api.delete('/me/push-subscriptions', { data: { endpoint: sub.endpoint } })
    await sub.unsubscribe()
  }
  return 'off'
}

/** 이 기기의 알림 상태와 켜기 · 끄기 */
export function usePush() {
  const [state, setState] = useState<PushState>('loading')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    readState()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState('off'))
    return () => {
      alive = false
    }
  }, [])

  const run = useCallback(async (action: () => Promise<PushState>) => {
    setPending(true)
    setError(null)
    try {
      setState(await action())
    } catch {
      setError('알림 설정을 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.')
    } finally {
      setPending(false)
    }
  }, [])

  return {
    state,
    pending,
    error,
    turnOn: () => run(subscribe),
    turnOff: () => run(unsubscribe),
  }
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// 크롬 · 안드로이드가 '설치할 수 있음'을 알려 주는 이벤트. 화면보다 먼저 올 수 있어 앱 시작 때부터 받아 둔다
let deferredInstall: InstallPromptEvent | null = null
const installListeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstall = e as InstallPromptEvent
    installListeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    deferredInstall = null
    installListeners.forEach((fn) => fn())
  })
}

/** 홈 화면에 추가 — 크롬 · 안드로이드는 버튼, 아이폰은 공유 → 홈 화면에 추가 안내 */
export function useInstall() {
  const [canPrompt, setCanPrompt] = useState(deferredInstall != null)
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => {
    const update = () => setCanPrompt(deferredInstall != null)
    installListeners.add(update)
    return () => {
      installListeners.delete(update)
    }
  }, [])

  /** 브라우저 설치 창을 띄운다. 이벤트는 한 번만 쓸 수 있고, 못 띄우면 'failed' */
  async function prompt(): Promise<'accepted' | 'dismissed' | 'failed'> {
    const event = deferredInstall
    deferredInstall = null
    setCanPrompt(false)
    if (!event) return 'failed'
    try {
      await event.prompt()
      const { outcome } = await event.userChoice
      if (outcome === 'accepted') setInstalled(true)
      return outcome
    } catch {
      return 'failed'
    }
  }

  return { installed, canPrompt, ios: isIos(), prompt }
}
