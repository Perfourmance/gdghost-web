// /api 요청을 백엔드(Railway)로 넘겨 같은 주소로 쓴다 — 쿠키 · CSRF가 그대로 동작
const BACKEND = 'https://gdghost-server-production.up.railway.app'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)
    const target = new URL(url.pathname + url.search, BACKEND)
    // 백엔드의 리다이렉트는 따라가지 않고 브라우저에 그대로 돌려준다
    return fetch(new Request(target, request), { redirect: 'manual' })
  },
}
