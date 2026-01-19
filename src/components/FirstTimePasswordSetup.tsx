import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Toast } from './Toast'

export function FirstTimePasswordSetup({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSetPassword = async () => {
    if (!password.trim()) {
      showToast('비밀번호를 입력해주세요', 'error')
      return
    }

    if (password.length < 6) {
      showToast('비밀번호는 최소 6자 이상이어야 합니다', 'error')
      return
    }

    if (password !== confirmPassword) {
      showToast('비밀번호가 일치하지 않습니다', 'error')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: { has_password: true },
      })
      if (error) throw error

      showToast('비밀번호가 설정되었습니다', 'success')
      setTimeout(() => {
        onComplete()
      }, 1000)
    } catch (e: any) {
      console.error(e)
      showToast(e.message || '비밀번호 설정 실패', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 360, margin: '60px auto', padding: 16 }}>
        <h2 className="page-title">비밀번호 설정</h2>
        <p className="hint" style={{ marginTop: 8, marginBottom: 24 }}>
          재로그인을 위해 비밀번호를 설정해주세요.
        </p>

        <div className="settings-form">
          <input
            className="input"
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleSetPassword()
              }
            }}
          />

          <input
            className="input"
            type="password"
            placeholder="비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleSetPassword()
              }
            }}
          />

          <button className="btn on settings-btn" onClick={handleSetPassword} disabled={loading || !password.trim()}>
            {loading ? '설정 중…' : '비밀번호 설정'}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

