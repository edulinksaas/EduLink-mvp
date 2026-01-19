import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { TodayClassesPage } from './TodayClassesPage'
import { SettingsPage } from './SettingsPage'
import { OnboardingAcademyPage } from './OnboardingAcademyPage'

export function AppPage() {
  const { user } = useAuth()
  const [academyId, setAcademyId] = useState<string | null | undefined>(undefined)
  const [tab, setTab] = useState<'attendance' | 'settings'>('attendance')

  // 로그인 후 academy_users에서 academy_id 조회
  useEffect(() => {
    if (!user) {
      setAcademyId(null)
      return
    }

    const loadAcademyId = async () => {
      const { data, error } = await supabase
        .from('academy_users')
        .select('academy_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Failed to load academy_id:', error)
        setAcademyId(null)
        return
      }

      setAcademyId(data?.academy_id ?? null)
    }

    loadAcademyId()
  }, [user])

  // academy_id가 생성되면 출결 페이지로 전환
  const handleAcademyCreated = (newAcademyId: string) => {
    setAcademyId(newAcademyId)
    setTab('attendance')
  }

  // 로딩 중
  if (academyId === undefined) {
    return (
      <div className="app-container">
        <div style={{ padding: 24, textAlign: 'center' }}>로딩중…</div>
      </div>
    )
  }

  // academy_id가 없으면 OnboardingAcademyPage 표시
  if (academyId === null) {
    return (
      <div className="app-container">
        <OnboardingAcademyPage onAcademyCreated={handleAcademyCreated} />
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="appTabs">
        <button className={`tabBtn ${tab === 'attendance' ? 'on' : ''}`} onClick={() => setTab('attendance')}>
          출결
        </button>
        <button className={`tabBtn ${tab === 'settings' ? 'on' : ''}`} onClick={() => setTab('settings')}>
          세팅
        </button>
      </div>

      {tab === 'attendance' ? (
        <TodayClassesPage academyId={academyId} />
      ) : (
        <SettingsPage academyId={academyId} />
      )}
    </div>
  )
}

