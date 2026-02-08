import React from "react"
import { useNavigate, useParams } from "react-router-dom"

export default function ParentTokenPage() {
  const nav = useNavigate()
  const { token } = useParams<{ token: string }>()
  const [remember, setRemember] = React.useState(true)

  React.useEffect(() => {
    if (!token) return
    // ✅ token 페이지에 들어오면 바로 저장 + 이동하고 싶으면 아래 주석 해제
    // localStorage.setItem("edulink_parent_token", token)
    // nav("/parent/app", { replace: true })
  }, [token, nav])

  const onContinue = () => {
    if (!token) return
    if (remember) localStorage.setItem("edulink_parent_token", token)
    else localStorage.removeItem("edulink_parent_token")

    nav("/parent/app", { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-white rounded-[28px] border border-gray-100 shadow-sm p-6">
        <div className="text-[18px] font-extrabold text-[#1a1a1a] mb-2">학부모 전용</div>
        <div className="text-[13px] text-gray-400 mb-5">
          학원에서 받은 초대 링크로 출결/피드백을 확인합니다.
        </div>

        <div className="text-[12px] text-gray-400 mb-2">토큰</div>
        <div className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-[13px] text-gray-700 break-all">
          {token ?? ""}
        </div>

        <label className="flex items-center gap-2 text-[13px] text-gray-500 font-semibold mt-4">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          이 기기에서 저장
        </label>

        <button
          onClick={onContinue}
          className="mt-5 h-12 w-full rounded-2xl bg-[#6344d4] text-white font-extrabold"
        >
          학부모 페이지로 이동
        </button>
      </div>
    </div>
  )
}