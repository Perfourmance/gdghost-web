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
      // 웹 푸시를 받으려고 서비스 워커를 직접 쓴다 (src/sw.ts)
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // 첫 로딩 화면을 그리기 전에 서비스 워커 등록 파일을 기다리지 않는다.
      injectRegister: 'script-defer',
      manifest: {
        name: 'GDGhost',
        short_name: 'GDGhost',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        background_color: '#F6F8FC',
        theme_color: '#F6F8FC',
        // 앱 아이콘: 별 안은 유령 (temp/design/gdghost/assets/gdghost-icon.png에서 둥근 모서리 · 워터마크를 잘라 냄)
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // 앱 파일 · 그림을 미리 받아 둔다. 글꼴(조각 100여 개)은 쓸 때 받는다
        globPatterns: ['**/*.{js,css,html,svg,png}'],
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
