import React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabase"

type ActionType = "absent" | "late" | "ask"

const ACTION_META: Record<ActionType, { title: string; subtitle: string; badge: string }> = {
  absent: { title: "결석 전달", subtitle: "오늘 수업 결석 사유를 학원에 전달합니다.", badge: "결석" },
  late: { title: "지각 전달", subtitle: "도착 예정 시간/사유를 학원에 전달합니다.", badge: "지각" },
  ask: { title: "문의하기", subtitle: "학원에 남길 문의 내용을 작성해주세요.", badge: "문의" },
}

function getDefaultMessage(type: ActionType) {
  if (type === "absent") return "오늘 결석합니다. 사유: "
  if (type === "late") return "지각합니다. 도착 예정: \n사유: "
  return "문의 내용: "
}

export default function ParentActionPage() {
  const nav = useNavigate()
  const [sp] = useSearchParams()

  const type = (sp.get("type") as ActionType) || "ask"
  const meta = ACTION_META[type] ?? ACTION_META.ask

  const [message, setMessage] = React.useState(() => getDefaultMessage(type))
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    // type 바뀌면 기본 문구도 갱신
    setMessage(getDefaultMessage(type))
  }, [type])

  React.useEffect(() => {
    // 토큰 없으면 로그인(학부모)로
    const token = localStorage.getItem("edulink_parent_token")
    if (!token) nav("/login?mode=parent", { replace: true })
  }, [nav])

  const onBack = () => nav(-1)

  const onSubmit = async () => {
    if (!message.trim()) {
      alert("내용을 입력해주세요.")
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem("edulink_parent_token") ?? ""

      const { error } = await supabase.rpc("create_parent_action", {
        p_token: token,
        p_action_type: type, // "absent" | "late" | "ask"
        p_message: message,
      })

      if (error) throw error

      alert("학원에 전달되었습니다.")
      nav("/parent/app", { replace: true })
    } catch (e: any) {
      alert(e.message ?? "전송 실패")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* 모달처럼 보이는 카드 */}
      <div className="w-full sm:max-w-[520px] bg-white rounded-t-[28px] sm:rounded-[28px] p-5 border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-extrabold text-[#1a1a1a]">{meta.title}</h1>
              <span className="px-2.5 py-1 rounded-full bg-[#f3f0ff] text-[#6344d4] text-[12px] font-extrabold">
                {meta.badge}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-gray-400 font-semibold">{meta.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 text-gray-600 font-black active:scale-[0.99]"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="mt-4">
          <div className="text-[13px] font-extrabold text-gray-500 mb-2">전달 내용</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full rounded-[20px] border border-gray-200 bg-[#fafbff] px-4 py-3 text-[14px] font-semibold text-[#1a1a1a] outline-none focus:border-[#6344d4]"
            placeholder="예) 오늘 감기 기운이 있어 결석합니다."
          />
          <div className="mt-2 text-[12px] text-gray-400 font-semibold">
            제출하면 학원 상담 피드에서 확인할 수 있게 연결할 수 있어.
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="h-12 rounded-[22px] border border-gray-200 bg-white text-[14px] font-extrabold text-gray-600 active:scale-[0.99] disabled:opacity-60"
          >
            취소
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="h-12 rounded-[22px] bg-[#6344d4] text-white text-[14px] font-extrabold shadow-sm active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? "전달 중..." : "학원에 전달"}
          </button>
        </div>
      </div>
    </div>
  )
}