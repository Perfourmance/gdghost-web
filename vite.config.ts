import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GDGhost',
        short_name: 'GDGhost',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        background_color: '#F6F8FC',
        theme_color: '#F6F8FC',
      },
      workbox: {
        // API 응답은 서비스 워커가 캐시하지 않는다 (로그인 여부에 따라 응답이 다름)
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    // 백엔드 WEB_URL 기본값과 맞춘다
    port: 3000,
    strictPort: true,
    // 같은 주소로 붙여야 쿠키 · CSRF가 그대로 동작한다
    proxy: { '/api': 'http://localhost:8080' },
  },
})
