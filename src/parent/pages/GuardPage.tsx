import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../../App.css"

const STORAGE_KEY = "edulink_parent_token"
const PARENT_TOKEN_KEY = "edulink_parent_token"

function extractToken(input: string): string | null {
  const v = input.trim()
  if (!v) return null

  // 1) 전체 URL 붙여넣기 (/p/:token)
  try {
    const url = new URL(v)
    const parts = url.pathname.split("/").filter(Boolean) // ["p", "TOKEN"]
    const pIndex = parts.indexOf("p")
    if (pIndex !== -1 && parts[pIndex + 1]) return parts[pIndex + 1]
  } catch {
    // URL 아님
  }

  // 2) "/p/TOKEN" 형태
  const m = v.match(/\/p\/([^/?#]+)/)
  if (m?.[1]) return m[1]

  // 3) 토큰만
  return v
}

function getSavedToken(): string | null {
  try {
    const t = localStorage.getItem(STORAGE_KEY)
    return t && t.trim().length > 0 ? t.trim() : null
  } catch {
    return null
  }
}

function saveToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token)
}

function clearToken() {
  localStorage.removeItem(STORAGE_KEY)
}

export default function GuardPage() {
  const nav = useNavigate()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [savedToken, setSavedToken] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PARENT_TOKEN_KEY)
      if (saved) nav(`/p/${saved}`, { replace: true })
    } catch {}
  }, [nav])

  useEffect(() => {
    setSavedToken(getSavedToken())
  }, [])

  const placeholder = useMemo(
    () => "초대 링크를 붙여넣거나, 토큰만 입력하세요",
    []
  )

  const goWithToken = (token: string) => {
    const t = token.trim()
    if (!t) return
    saveToken(t)
    setSavedToken(t)
    setError(null)
    nav(`/p/${t}`)
  }

  const go = () => {
    const token = extractToken(value)
    if (!token) {
      setError("초대 링크(또는 토큰)를 입력해주세요.")
      return
    }
    goWithToken(token)
  }

  const disconnect = () => {
    clearToken()
    setSavedToken(null)
    setValue("")
    setError(null)
  }

  return (
    <div className="parent-page-container">
      <h2 className="parent-page-header">학부모 전용 페이지입니다</h2>

      <p className="parent-page-empty" style={{ lineHeight: 1.7 }}>
        학원에서 받은 <b>초대 링크</b>를 <b>한 번만</b> 입력하면,
        <br />
        이후에는 <b>같은 기기/브라우저</b>에서 바로 출결을 확인할 수 있어요.
      </p>

      {savedToken && (
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            margin: "14px auto 0",
            padding: "12px 12px",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            background: "rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontSize: 13, marginBottom: 10, opacity: 0.85 }}>
            ✅ 이미 연결되어 있어요
          </div>

          <button
            onClick={() => goWithToken(savedToken)}
            className="parent-page-button"
            style={{ width: "100%" }}
          >
            바로 출결 보기
          </button>

          <button
            onClick={disconnect}
            className="parent-page-button"
            style={{
              width: "100%",
              marginTop: 8,
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.15)",
            }}
          >
            연결 해제
          </button>

          <p style={{ marginTop: 10, fontSize: 12, opacity: 0.65, lineHeight: 1.5 }}>
            다른 자녀/학원으로 바꾸려면 "연결 해제" 후 새 링크를 입력하세요.
          </p>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 420, margin: "16px auto 0" }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="parent-page-input"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter") go()
          }}
        />

        <button
          onClick={go}
          className="parent-page-button"
          style={{ marginTop: 10, width: "100%" }}
        >
          확인
        </button>

        {error && (
          <p style={{ marginTop: 10, fontSize: 12, color: "#b00020" }}>{error}</p>
        )}

        <p style={{ marginTop: 10, fontSize: 12, opacity: 0.65, lineHeight: 1.6 }}>
          예) https://도메인/p/토큰 형태의 링크를 그대로 붙여넣어도 돼요.
        </p>
      </div>
    </div>
  )
}

