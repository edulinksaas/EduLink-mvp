// localStorage 기반 학원 선택 세션 관리

const STORAGE_KEY = 'edulink_academy_id'

export function getSelectedAcademyId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function setSelectedAcademyId(academyId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, academyId)
}

export function clearSelectedAcademyId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

