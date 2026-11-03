const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g

/** 사용자가 쓴 글 — 줄바꿈 유지, 주소는 새 창 링크(rel="noopener nofollow", 인계 문서 5장) */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_PATTERN)
  return (
    <p className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener nofollow"
            className="break-all text-brand-text underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  )
}
