import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function OnboardingAcademyPage({
  onAcademyCreated,
}: {
  onAcademyCreated: (academyId: string) => void
}) {
  const [academyName, setAcademyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createAcademy = async () => {
    const name = academyName.trim()
    if (!name) {
      setError('학원 이름을 입력해주세요')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      // 1. academies에 학원 생성
      const { data: academy, error: academyError } = await supabase
        .from('academies')
        .insert({ name })
        .select('id')
        .single()

      if (academyError) throw academyError
      if (!academy) throw new Error('학원 생성 실패')

      // 2. academy_users에 연결
      const { error: linkError } = await supabase.from('academy_users').insert({
        user_id: user.id,
        academy_id: academy.id,
        role: 'owner',
      })

      if (linkError) throw linkError

      // 완료 후 콜백 호출
      onAcademyCreated(academy.id)
    } catch (e: any) {
      console.error(e)
      setError(e.message || '학원 생성 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="settings-header">
        <h1 className="settings-title">학원 연결</h1>
      </div>

      <div className="settings-card settings-card-highlight">
        <h2 className="settings-card-title">학원 생성</h2>
        <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
          새로운 학원을 생성하고 연결합니다.
        </p>
        <div className="settings-form">
          <input
            className="input"
            value={academyName}
            onChange={(e) => setAcademyName(e.target.value)}
            placeholder="예) ABC 학원"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                createAcademy()
              }
            }}
          />
          <button className="btn on settings-btn" onClick={createAcademy} disabled={loading || !academyName.trim()}>
            {loading ? '생성 중…' : '학원 생성'}
          </button>
          {error && <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 8 }}>{error}</div>}
        </div>
      </div>
    </div>
  )
}

