import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** GET /departments 응답. name이 저장 값, division은 속한 학부 · 학과(선택지 자체가 학과 · 학부면 없음) */
export interface DepartmentsResponse {
  colleges: { name: string; departments: { name: string; division?: string | null }[] }[]
}

/** 학과 선택지. 비회원도 부르고, 잘 바뀌지 않아 1시간 그대로 쓴다 */
export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get<DepartmentsResponse>('/departments')).data,
    staleTime: 60 * 60 * 1000,
  })
}

export function isDepartment(list: DepartmentsResponse | undefined, name: string): boolean {
  return list?.colleges.some((c) => c.departments.some((d) => d.name === name)) ?? false
}
