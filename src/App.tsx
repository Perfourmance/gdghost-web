import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import door from '@/assets/mascot/door.png'

// 세팅 확인용 임시 화면. 실제 화면을 만들면 지운다
export default function App() {
  const [api, setApi] = useState('확인 중…')

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => setApi(`백엔드 연결됨 (HTTP ${res.status})`))
      .catch(() => setApi('백엔드에 연결하지 못했어요. 서버가 켜져 있는지 확인하세요'))
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4">
      <img src={door} alt="" className="w-28" />
      <h1 className="text-2xl font-bold">
        <span className="text-brand">GDG</span>
        <span className="text-title">host</span>
      </h1>
      <p className="text-sm text-muted-foreground">{api}</p>
      <Button onClick={() => document.documentElement.classList.toggle('dark')}>
        라이트 · 다크 바꿔 보기
      </Button>
    </main>
  )
}
