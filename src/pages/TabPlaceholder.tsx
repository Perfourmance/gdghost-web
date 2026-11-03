/** 아직 내용이 없는 탭 화면. 각 단위(F4 홈, F5 질문 …)에서 실제 화면으로 바꾼다 */
export function TabPlaceholder({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-xl font-bold text-title">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">준비 중인 화면이에요</p>
    </section>
  )
}
