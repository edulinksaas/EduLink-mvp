// src/pages/SignupPage.tsx
import React from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import "../App.css"

export default function SignupPage() {
  const nav = useNavigate()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [password2, setPassword2] = React.useState("")

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [msg, setMsg] = React.useState<string | null>(null)

  const signup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMsg(null)

    const e1 = email.trim()
    if (!e1 || !password) return setError("이메일과 비밀번호를 입력해주세요.")
    if (password.length < 6) return setError("비밀번호는 6자 이상이어야 해요.")
    if (password !== password2) return setError("비밀번호가 서로 달라요.")

    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email: e1, password })
      if (error) throw error

      setMsg("가입 완료 ✅ 이제 로그인해주세요.")
      // MEVP: 가입 후 로그인으로
      window.setTimeout(() => nav("/academy/login", { replace: true }), 600)
    } catch (e: any) {
      setError(e?.message ?? "회원가입 실패")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="authBrand">
          <div className="authLogo">E</div>
          <div>
            <div className="authTitle">Edu-link</div>
            <div className="authSub">학원 운영 · 학부모 커뮤니케이션</div>
          </div>
        </div>

        <h1 className="authH1">학원 회원가입</h1>
        <p className="authDesc">학원 관리자 계정을 생성합니다.</p>

        <form onSubmit={signup} className="authForm">
          <label className="authField">
            <span className="authLabel">이메일</span>
            <input
              className="authInput"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="example@academy.com"
            />
          </label>

          <label className="authField">
            <span className="authLabel">비밀번호</span>
            <input
              className="authInput"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="6자 이상"
            />
          </label>

          <label className="authField">
            <span className="authLabel">비밀번호 확인</span>
            <input
              className="authInput"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
              placeholder="한 번 더 입력"
            />
          </label>

          {error && <div className="authError">{error}</div>}
          {msg && <div className="authHint">{msg}</div>}

          <button className="authPrimary" disabled={loading}>
            {loading ? "가입 중..." : "가입하기"}
          </button>

          <button
            type="button"
            className="authSecondary"
            onClick={() => nav("/academy/login")}
            disabled={loading}
          >
            로그인으로 돌아가기
          </button>

          <div className="authHint">
            * 가입 후 “내 학원”이 자동 생성됩니다. (추후 학원명 변경 가능)
          </div>
        </form>

        <div className="authFooter">© 2026 Edu-link MVP</div>
      </div>
    </div>
  )
}