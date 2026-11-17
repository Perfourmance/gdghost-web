import { isDepartment, useDepartments } from '@/features/departments/useDepartments'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  value: string
  onChange: (name: string) => void
  invalid?: boolean
}

/** 단과대학별로 묶은 학과 선택. 목록에 없는 옛 값은 '골라 주세요'로 보인다 */
export function DepartmentSelect({ id, value, onChange, invalid }: Props) {
  const departments = useDepartments()
  const selected = isDepartment(departments.data, value) ? value : ''

  return (
    <>
      <select
        id={id}
        value={selected}
        disabled={!departments.data}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-12 w-full min-w-0 rounded-md border bg-card px-3 text-base text-foreground md:text-sm',
          'aria-invalid:border-destructive disabled:opacity-60',
          selected === '' && 'text-muted-foreground',
        )}
      >
        <option value="" disabled>
          {departments.isPending ? '불러오는 중…' : '학과를 골라 주세요'}
        </option>
        {departments.data?.colleges.map((college) => (
          <optgroup key={college.name} label={college.name}>
            {college.departments.map((d) => (
              <option key={d.name} value={d.name} className="text-foreground">
                {d.division ? `${d.name} (${d.division})` : d.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {departments.isError && (
        <p className="mt-1 text-sm text-destructive" role="alert">
          학과 목록을 불러오지 못했어요.{' '}
          <button type="button" className="underline" onClick={() => departments.refetch()}>
            다시 시도
          </button>
        </p>
      )}
    </>
  )
}
