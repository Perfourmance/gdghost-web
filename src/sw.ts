/// <reference lib="webworker" />
// 서비스 워커 (vite-plugin-pwa injectManifest). 앱 파일 미리 받아 두기 + 웹 푸시 받기 · 누르면 화면 열기.
// workbox 없이 직접 쓴다: 빌드가 넣어 주는 파일 목록(__WB_MANIFEST)을 캐시하고, 화면 이동만 index.html로 돌린다
import { notificationPath, type NotificationLike } from '@/features/notifications/targetPath'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision: string | null }[] }

const MANIFEST = self.__WB_MANIFEST
// 파일 목록이 바뀌면 캐시 이름도 바뀌어 새로 받는다
const CACHE = `gdghost-${hash(MANIFEST.map((e) => `${e.url}@${e.revision ?? ''}`).join('|'))}`
// manifest 아이콘이 목록에 두 번 들어와 중복을 뺀다 (addAll은 같은 주소가 두 번이면 실패)
const urls = [...new Set(MANIFEST.map((e) => new URL(e.url, self.location.origin).href))]

function hash(text: string): string {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(urls))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gdghost-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // 화면 이동: 먼저 서버, 오프라인이면 받아 둔 index.html (API는 캐시하지 않는다 — 로그인 여부로 응답이 다름)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(new URL('/index.html', self.location.origin).href)) ?? Response.error()),
    )
    return
  }
  // 빌드 파일: 받아 둔 것 먼저
  if (urls.includes(url.href)) {
    event.respondWith(caches.match(url.href).then((hit) => hit ?? fetch(request)))
  }
})

/** 백엔드 NotificationPusher가 보내는 모양 */
interface PushPayload extends NotificationLike {
  title: string
  body: string | null
}

self.addEventListener('push', (event) => {
  // 실제 푸시는 알림을 허용하고 구독한 기기에만 온다. 개발자 도구의 Push 흉내처럼 권한 없이 오면 띄우지 않는다
  if (Notification.permission !== 'granted') {
    console.warn(`[sw] 알림 권한이 없어 푸시를 띄우지 않았어요 (permission: ${Notification.permission})`)
    return
  }
  let payload: PushPayload | null = null
  try {
    payload = event.data?.json() as PushPayload
  } catch {
    payload = null
  }
  const title = payload?.title ?? 'GDGhost'
  const path = payload ? (notificationPath(payload, 0) ?? '/notifications') : '/notifications'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload?.body ?? undefined,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { path },
      lang: 'ko',
    }),
  )
})

/** 앱에 보내는 이동 요청 (main.tsx가 받아 라우터로 이동) */
export interface OpenPathMessage {
  type: 'OPEN_PATH'
  path: string
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = (event.notification.data as { path?: string } | null)?.path ?? '/'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (!open) {
        await self.clients.openWindow(new URL(path, self.location.origin).href)
        return
      }
      // 열린 앱 창에는 이동을 부탁한다. client.navigate()는 이 서비스 워커가 맡지 않은 창이면 거절돼 쓰지 않는다
      open.postMessage({ type: 'OPEN_PATH', path } satisfies OpenPathMessage)
      try {
        await open.focus()
      } catch {
        // 창을 앞으로 못 가져와도 이동은 된다
      }
    })(),
  )
})
