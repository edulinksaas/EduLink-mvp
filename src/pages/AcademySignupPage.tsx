import React from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { loadAcademyContext } from "../lib/loadAcademyContext"

// 이메일 정리 함수: trim + 공백 제거 + 앞뒤 따옴표 제거
function cleanEmail(email: string): string {
  return email
    .trim()
    .replace(/\s+/g, "") // 모든 공백 제거
    .replace(/^["']|["']$/g, "") // 앞뒤 따옴표 제거
}

export default function AcademySignupPage() {
  const nav = useNavigate()

  const [academyName, setAcademyName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. 입력값 검증 및 정리
      const trimmedAcademyName = academyName.trim()
      const cleanedEmail = cleanEmail(email)
      const trimmedPassword = password.trim()

      if (!trimmedAcademyName) {
        throw new Error("학원명을 입력해주세요.")
      }
      if (!cleanedEmail) {
        throw new Error("이메일을 입력해주세요.")
      }
      if (!trimmedPassword || trimmedPassword.length < 6) {
        throw new Error("비밀번호는 6자 이상이어야 합니다.")
      }

      // 2. Supabase Auth 회원가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanedEmail,
        password: trimmedPassword,
      })

      if (authError || !authData.user) throw authError

      const userId = authData.user.id

      // 3. Session 확인 및 확보 (Confirm email ON 상태 대응)
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        // session이 없으면 즉시 로그인하여 session 확보
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanedEmail,
          password: trimmedPassword,
        })
        if (signInError) throw signInError
      }

      // 4. academies 테이블에 학원 생성 (auth.uid() 사용)
      const { data: academy, error: academyError } = await supabase
        .from("academies")
        .insert({
          name: trimmedAcademyName,
          owner_user_id: userId,
        })
        .select("id")
        .single()

      if (academyError) throw academyError

      const academyId = academy.id

      // 4. academy_users 테이블에 owner로 연결
      const { error: academyUserError } = await supabase
        .from("academy_users")
        .insert({
          user_id: userId,
          academy_id: academyId,
          role: "owner",
        })

      if (academyUserError) {
        // academy_users 생성 실패 시 academies 삭제 시도 (롤백)
        try {
          await supabase.from("academies").delete().eq("id", academyId)
        } catch {}
        throw new Error(`학원 연결 실패: ${academyUserError.message}`)
      }

      // 5. academy context 로드
      await loadAcademyContext(academyId)

      // 6. 성공 시 /academy/home으로 이동
      nav("/academy/home", { replace: true })
    } catch (e: any) {
      console.error("회원가입 실패:", e)
      setError(e?.message ?? "회원가입에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="loginBg">
      <div className="loginCard">
        {/* 헤더 */}
        <div className="loginInner">
          <div className="loginHeader">
            <div className="loginLogoRow">
              <img className="loginLogo" src="/logo.png" alt="Edu-Link" />
            </div>

            <div className="loginSubtitle">학원 원장 회원가입</div>
          </div>

          <form onSubmit={onSubmit} className="loginForm">
            <div className="field">
              <div className="label">학원명</div>
              <input
                className="input"
                value={academyName}
                onChange={(e) => setAcademyName(e.target.value)}
                placeholder="예: 해맑은 학원"
                disabled={loading}
              />
            </div>

            <div className="field">
              <div className="label">이메일</div>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="example@email.com"
                disabled={loading}
              />
            </div>

            <div className="field">
              <div className="label">비밀번호</div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="6자 이상 입력해주세요"
                disabled={loading}
              />
            </div>

            {error && <div className="error">{error}</div>}

            <button className="primaryBtn" type="submit" disabled={loading}>
              {loading ? "가입 중..." : "회원가입"}
            </button>

            <button
              type="button"
              className="subBtn"
              onClick={() => nav("/academy/login")}
              disabled={loading}
            >
              이미 계정이 있으신가요? 로그인하기
            </button>
          </form>
        </div>
      </div>

      <div className="copyright">© 2026 Edu-link MVP</div>
    </div>
  )
}

