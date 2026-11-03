// 비밀번호 규칙 (백엔드 Passwords: 8–64자, 영문 · 숫자 · 특수문자 모두, 공백 없음)
export const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: '8–64자', test: (pw) => pw.length >= 8 && pw.length <= 64 },
  { label: '영문', test: (pw) => /[A-Za-z]/.test(pw) },
  { label: '숫자', test: (pw) => /\d/.test(pw) },
  { label: '특수문자', test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
]

export function hasWhitespace(pw: string): boolean {
  return /\s/.test(pw)
}

export function isPasswordValid(pw: string): boolean {
  return !hasWhitespace(pw) && PASSWORD_RULES.every((rule) => rule.test(pw))
}
