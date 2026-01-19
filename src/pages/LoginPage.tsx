import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Toast } from '../components/Toast'

export default function LoginPage() {
  const [mode, setMode] = useState<'password' | 'magic-link'>('password')
  const [magicLinkMode, setMagicLinkMode] = useState<'signup' | 'reset'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('이메일과 비밀번호를 입력해주세요', 'error')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Invalid login credentials 에러를 사용자 친화적으로 처리
        if (error.message === 'Invalid login credentials' || error.message.includes('Invalid login credentials')) {
          showToast('이메일 또는 비밀번호가 올바르지 않습니다', 'error')
        } else {
          throw error
        }
        return
      }

      // password로 로그인 성공 시 has_password 플래그 설정
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user && !user.user_metadata?.has_password) {
        await supabase.auth.updateUser({
          data: { has_password: true },
        })
      }
      // 성공 시 onAuthStateChange가 세션을 업데이트함
    } catch (e: any) {
      console.error(e)
      showToast(e.message || '로그인 실패', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLinkSend = async () => {
    if (!email.trim()) {
      showToast('이메일을 입력해주세요', 'error')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })

      if (error) throw error
      setSent(true)
      const message = magicLinkMode === 'reset' ? '비밀번호 재설정 링크를 보냈습니다' : '가입/초대 링크를 보냈습니다'
      showToast(message, 'success')
    } catch (e: any) {
      console.error(e)
      showToast(e.message || '이메일 전송 실패', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 360, margin: '60px auto', padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            className={`tabBtn ${mode === 'password' ? 'on' : ''}`}
            onClick={() => {
              setMode('password')
              setSent(false)
              setMagicLinkMode('signup')
            }}
            style={{ flex: 1 }}
          >
            로그인
          </button>
          <button
            className={`tabBtn ${mode === 'magic-link' ? 'on' : ''}`}
            onClick={() => {
              setMode('magic-link')
              setSent(false)
              setMagicLinkMode('signup')
            }}
            style={{ flex: 1 }}
          >
            가입하기
          </button>
        </div>

        {mode === 'password' ? (
          <>
            <h2 className="page-title" style={{ marginBottom: 8 }}>로그인</h2>
            <p className="hint" style={{ marginTop: 0, marginBottom: 24 }}>
              출결 기록을 위한 테스트 버전입니다
            </p>

            <div className="settings-form">
              <input
                className="input"
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handlePasswordLogin()
                  }
                }}
              />

              <input
                className="input"
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handlePasswordLogin()
                  }
                }}
              />

              <button className="btn on settings-btn" onClick={handlePasswordLogin} disabled={loading || !email.trim() || !password.trim()}>
                {loading ? '로그인 중…' : '로그인'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="page-title" style={{ marginBottom: 8 }}>
              {magicLinkMode === 'reset' ? '비밀번호 재설정' : '초대/가입'}
            </h2>
            <p className="hint" style={{ marginTop: 0, marginBottom: 24 }}>
              {magicLinkMode === 'reset'
                ? '비밀번호 재설정 링크를 보내드려요.'
                : '처음이신가요? 이메일로 가입/초대 확인 링크를 보내드려요.'}
            </p>

            <div className="settings-form">
              <input
                className="input"
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || sent}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading && !sent) {
                    handleMagicLinkSend()
                  }
                }}
              />

              <button className="btn on settings-btn" onClick={handleMagicLinkSend} disabled={loading || sent || !email.trim()}>
                {loading ? '보내는 중…' : sent ? '이메일 전송됨' : magicLinkMode === 'reset' ? '재설정 링크 보내기' : '가입 링크 보내기'}
              </button>

              {sent && (
                <p className="hint" style={{ marginTop: 0, textAlign: 'center' }}>
                  이메일을 확인하고 링크를 클릭해주세요.
                </p>
              )}

              {magicLinkMode === 'signup' && (
                <button
                  onClick={() => {
                    setMagicLinkMode('reset')
                    setSent(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    fontSize: 12,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 8,
                    marginTop: 8,
                  }}
                >
                  비밀번호를 잊었나요?
                </button>
              )}

              {magicLinkMode === 'reset' && (
                <button
                  onClick={() => {
                    setMagicLinkMode('signup')
                    setSent(false)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    fontSize: 12,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 8,
                    marginTop: 8,
                  }}
                >
                  가입/초대 링크로 돌아가기
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}

