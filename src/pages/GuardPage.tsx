import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../App.css"

function extractToken(input: string): string | null {
  const v = input.trim()
  if (!v) return null
  try {
    const url = new URL(v)
    const parts = url.pathname.split("/").filter(Boolean)
    const pIndex = parts.indexOf("p")
    if (pIndex !== -1 && parts[pIndex + 1]) return parts[pIndex + 1]
  } catch {}
  const m = v.match(/\/p\/([^/?#]+)/)
  if (m?.[1]) return m[1]
  return v
}

export default function GuardPage() {
  const nav = useNavigate()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  const placeholder = useMemo(() => "초대 링크 또는 토큰을 입력하세요", [])

  const go = () => {
    const token = extractToken(value)
    if (!token) {
      setError("초대 링크(또는 토큰)를 입력해주세요.")
      return
    }
    setError(null)
    nav(`/p/${token}`)
  }

  return (
    <div className="gate-shell">
      <div className="gate-card">
        <h1 className="gate-title">학부모 전용 페이지</h1>

        <p className="gate-desc">
          학원에서 받은 <b>초대 링크</b>를 한 번만 입력하면,
          <br />
          이후에는 이 기기/브라우저에서 바로 출결을 확인할 수 있어요.
        </p>

        <div className="gate-form">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="gate-input"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />

          <button onClick={go} className="gate-primary" type="button">
            확인
          </button>

          {error && <p className="gate-error">{error}</p>}

          <p className="gate-hint">
            예) https://도메인/p/토큰 형태의 링크를 그대로 붙여넣어도 돼요.
          </p>
        </div>
      </div>
    </div>
  )
}