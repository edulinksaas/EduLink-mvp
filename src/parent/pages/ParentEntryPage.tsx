import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

function extractToken(input: string): string | null {
  const v = input.trim()
  if (!v) return null

  // URL 붙여넣기
  try {
    const url = new URL(v)
    const parts = url.pathname.split("/").filter(Boolean) // ["p", "TOKEN", ...]
    const pIndex = parts.indexOf("p")
    if (pIndex !== -1 && parts[pIndex + 1]) return parts[pIndex + 1]
  } catch {}

  // "/p/TOKEN" 형태
  const m = v.match(/\/p\/([^/?#]+)/)
  if (m?.[1]) return m[1]

  // 토큰만
  return v
}

export default function ParentEntryPage() {
  const nav = useNavigate()
  const [invite, setInvite] = useState("")
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const onGo = () => {
    setError(null)
    const token = extractToken(invite)
    if (!token) {
      setError("초대 링크(또는 토큰)를 입력해주세요.")
      return
    }
    if (remember) localStorage.setItem("edulink_parent_token", token)
    nav(`/p/${token}`, { replace: true })
  }

  // 자동 진입(저장된 토큰이 있으면 바로 이동)
  React.useEffect(() => {
    const saved = localStorage.getItem("edulink_parent_token")
    if (saved) nav(`/p/${saved}`, { replace: true })
  }, [nav])

  return (
    <div className="page">
      <div className="card">
        <h2 className="title">학부모 전용</h2>
        <p className="sub">학원에서 받은 초대 링크로 출결/피드백을 확인합니다.</p>

        <div className="form">
          <input
            className="input"
            placeholder="초대 링크를 붙여넣거나 토큰만 입력"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />

          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            이 기기에서 다음부터 자동으로 보기
          </label>

          <button className="button" onClick={onGo}>
            확인
          </button>

          <button
            className="button button--ghost"
            onClick={() => nav("/academy/login", { replace: true })}
          >
            학원 로그인으로
          </button>

          {error && <div className="error">{error}</div>}

          <div className="hint">
            예) https://도메인/p/토큰 형태의 링크를 그대로 붙여넣어도 돼요.
          </div>
        </div>
      </div>
    </div>
  )
}