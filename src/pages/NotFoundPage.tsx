import { Link } from 'react-router'
import shh from '@/assets/mascot/shh.png'
import { buttonVariants } from '@/components/ui/button'

/** 없는 주소 */
export function NotFoundPage() {
  return (
    <CenteredMessage title="없는 페이지예요" description="주소를 다시 확인해 주세요">
      <Link to="/" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
        홈으로
      </Link>
    </CenteredMessage>
  )
}

export function CenteredMessage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <img src={shh} alt="" className="w-28" />
      <h1 className="text-xl font-bold text-title">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-2 w-full">{children}</div>
    </main>
  )
}
