import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../../App.css"

const STORAGE_KEY = "edulink_parent_token"

function extractToken(input: string): string | null {
  const v = input.trim()
  if (!v) return null

  // 1) 전체 URL
  try {
    const url = new URL(v)
    const parts = url.pathname.split("/").filter(Boolean) // ["p", "TOKEN"]
    const pIndex = parts.indexOf("p")
    if (pIndex !== -1 && parts[pIndex + 1]) return parts[pIndex + 1]
  } catch {
    // URL이 아니면 패스
  }

  // 2) "/p/TOKEN"
  const m = v.match(/\/p\/([^/?#]+)/)
  if (m?.[1]) return m[1]

  // 3) 토큰만
  return v
}

export default function ParentGuardPage() {
  const nav = useNavigate()

  const [value, setValue] = useState("")
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const placeholder = useMemo(
    () => "초대 링크를 붙여넣거나, 토큰만 입력하세요",
    []
  )

  // ✅ 저장된 토큰이 있으면 자동 이동
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      nav(`/p/${saved}`, { replace: true })
    }
  }, [nav])

  const go = () => {
    const token = extractToken(value)
    if (!token) {
      setError("초대 링크(또는 토큰)를 입력해주세요.")
      return
    }

    setError(null)
    if (remember) localStorage.setItem(STORAGE_KEY, token)
    nav(`/p/${token}`)
  }

  const clearSaved = () => {
    localStorage.removeItem(STORAGE_KEY)
    setValue("")
    setError(null)
    alert("저장된 링크를 삭제했어요.")
  }

  return (
    <div className="parent-page-container">
      <h2 className="parent-page-header">학부모 전용</h2>

      <p className="parent-page-empty" style={{ lineHeight: 1.7 }}>
        학원에서 받은 <b>초대 링크</b>를 입력하면
        <br />
        아이의 최근 출결/피드백 기록을 확인할 수 있어요.
      </p>

      <div style={{ width: "100%", maxWidth: 420, margin: "16px auto 0" }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="parent-page-input"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />

        <label style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 13, opacity: 0.8 }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          이 기기에서 다음부터 자동으로 보기
        </label>

        <button
          onClick={go}
          className="parent-page-button"
          style={{ marginTop: 10, width: "100%" }}
        >
          확인
        </button>

        {error && (
          <p style={{ marginTop: 10, fontSize: 12, color: "#b00020" }}>
            {error}
          </p>
        )}

        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.65, lineHeight: 1.6 }}>
          예) https://도메인/p/토큰 형태의 링크를 그대로 붙여넣어도 돼요.
        </p>

        <button
          onClick={clearSaved}
          className="parent-page-button"
          style={{
            marginTop: 12,
            width: "100%",
            background: "#fff",
            color: "#555",
            border: "1px solid #ddd",
          }}
        >
          저장된 링크 삭제
        </button>
      </div>
    </div>
  )
}