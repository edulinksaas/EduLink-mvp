import React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabase"

type AttendanceRecord = {
  record_date: string
  status: "present" | "absent"
  feedback_code: "good" | "normal" | "low" | "need" | null
}

type TodayRecord = {
  date: string
  emoji: string
  feedback: string
  attendance: string
}

type RecentRecord = {
  date: string
  emoji: string
  feedback: string
  attendance: string
}

type ParentReply = {
  id: string
  date: string // YYYY-MM-DD (created_at 기준)
  actionType: string
  parentMessage: string
  replyMessage: string
  repliedAt: string | null
}

function getTodayDateKST(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function toYYYYMMDD(dateLike: string): string {
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return String(dateLike).slice(0, 10)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function mapFeedbackCode(code: string | null): { emoji: string; label: string } {
  switch (code) {
    case "good":
      return { emoji: "😊", label: "집중 잘함" }
    case "normal":
      return { emoji: "🙂", label: "보통" }
    case "low":
      return { emoji: "😓", label: "컨디션 저조" }
    case "need":
      return { emoji: "⚠️", label: "지도 필요" }
    default:
      return { emoji: "•", label: "-" }
  }
}

function mapAttendanceStatus(status: string | null): string {
  if (status === "present") return "출석"
  if (status === "absent") return "결석"
  return "-"
}

function actionTypeLabel(actionType: string) {
  if (actionType === "absent") return "결석"
  if (actionType === "late") return "지각"
  if (actionType === "ask") return "문의"
  return "알림"
}

function formatKST(iso?: string | null) {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export default function ParentAppPage() {
  const nav = useNavigate()
  const { token: tokenParam } = useParams<{ token?: string }>()
  const [sp] = useSearchParams()
  const tokenQuery = sp.get("token") || ""

  const tokenFromUrl = tokenParam || tokenQuery
  const tokenFromStorage = localStorage.getItem("edulink_parent_token")
  const token = tokenFromUrl || tokenFromStorage || ""

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [studentName, setStudentName] = React.useState<string>("")
  const [todayRecord, setTodayRecord] = React.useState<TodayRecord | null>(null)
  const [recentRecords, setRecentRecords] = React.useState<RecentRecord[]>([])

  // ✅ 답변만 따로 모아 보여주기 위한 상태
  const [repliesByDate, setRepliesByDate] = React.useState<Record<string, ParentReply[]>>({})
  const [replyOpen, setReplyOpen] = React.useState(true)

  React.useEffect(() => {
    const loadData = async () => {
      if (!token) {
        localStorage.removeItem("edulink_parent_token")
        nav("/login?mode=parent", { replace: true })
        return
      }

      try {
        setLoading(true)
        setError(null)

        // 1) 토큰 -> student_id
        const { data: tokenData, error: tokenError } = await supabase
          .from("parent_tokens")
          .select("student_id")
          .eq("token", token)
          .maybeSingle()

        if (tokenError) throw tokenError
        if (!tokenData?.student_id) {
          localStorage.removeItem("edulink_parent_token")
          throw new Error("유효하지 않은 토큰입니다.")
        }

        const studentId = tokenData.student_id

        // 2) 학생 이름
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id, name")
          .eq("id", studentId)
          .maybeSingle()

        if (studentError) throw studentError
        if (!studentData) throw new Error("학생 정보를 찾을 수 없습니다.")
        setStudentName(studentData.name)

        const today = getTodayDateKST()

        // 3) 출결 records
        const { data: recordsData, error: recordsError } = await supabase
          .from("attendance_records")
          .select("record_date, status, feedback_code")
          .eq("student_id", studentId)
          .order("record_date", { ascending: false })
          .limit(30)

        if (recordsError) throw recordsError

        const records: AttendanceRecord[] = (recordsData || []).map((r: any) => ({
          record_date: r.record_date,
          status: r.status,
          feedback_code: r.feedback_code,
        }))

        const todayRecordData = records.find((r) => r.record_date === today) || records[0]

        if (todayRecordData) {
          const fb = mapFeedbackCode(todayRecordData.feedback_code)
          const attendanceText =
            todayRecordData.record_date === today && todayRecordData.status === "present"
              ? "출석 완료"
              : mapAttendanceStatus(todayRecordData.status)

          setTodayRecord({
            date: todayRecordData.record_date,
            emoji: fb.emoji,
            feedback: fb.label,
            attendance: attendanceText,
          })
        } else {
          setTodayRecord(null)
        }

        setRecentRecords(
          records.slice(0, 30).map((r) => {
            const fb = mapFeedbackCode(r.feedback_code)
            return {
              date: r.record_date,
              emoji: fb.emoji,
              feedback: fb.label,
              attendance: mapAttendanceStatus(r.status),
            }
          })
        )

        // 4) ✅ 학원 답변만(parent_actions.reply_message) 가져오기
        const { data: actions, error: actionsError } = await supabase
          .from("parent_actions")
          .select("id, created_at, action_type, message, reply_message, replied_at")
          .eq("student_id", studentId)
          .not("reply_message", "is", null)
          .order("replied_at", { ascending: false })
          .limit(50)

        if (actionsError) throw actionsError

        const replies: ParentReply[] = (actions || [])
          .filter((x: any) => (x.reply_message || "").trim().length > 0)
          .map((x: any) => ({
            id: x.id,
            date: toYYYYMMDD(x.created_at),
            actionType: x.action_type,
            parentMessage: x.message || "",
            replyMessage: x.reply_message || "",
            repliedAt: x.replied_at,
          }))

        // 날짜별 그룹핑
        const grouped: Record<string, ParentReply[]> = {}
        for (const r of replies) {
          if (!grouped[r.date]) grouped[r.date] = []
          grouped[r.date].push(r)
        }
        setRepliesByDate(grouped)
      } catch (e: any) {
        console.error("데이터 로드 실패:", e)
        localStorage.removeItem("edulink_parent_token")
        setError(e?.message || "데이터를 불러오는데 실패했습니다.")
        setTimeout(() => {
          nav("/login?mode=parent", { replace: true })
        }, 1200)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [token, nav])

  const onLogout = () => {
    localStorage.removeItem("edulink_parent_token")
    nav("/login?mode=parent", { replace: true })
  }

  const onAction = (type: "absent" | "late" | "ask") => {
    nav(`/parent/action?type=${type}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center">
        <div className="text-gray-500 text-[14px]">불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center px-4">
        <div className="text-red-500 text-[14px] text-center">{error}</div>
      </div>
    )
  }

  const today = getTodayDateKST()
  const replyDates = Object.keys(repliesByDate).sort((a, b) => (a > b ? -1 : 1))

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-[520px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/Edu-link-p.png"
              alt="Edulink"
              className="w-9 h-9 rounded-xl object-cover"
            />
            <div className="leading-tight">
              <div className="text-[12px] text-gray-400 font-bold">학부모 전용</div>
              <div className="text-[14px] font-extrabold text-[#1a1a1a]">{studentName} 리포트</div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="h-10 px-4 rounded-2xl bg-[#6344d4] text-white text-[13px] font-extrabold shadow-sm hover:opacity-95 active:scale-[0.99]"
            type="button"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="max-w-[520px] mx-auto px-4 py-6 space-y-6">
        {/* ✅ 학원 답변만 섹션 (완전 분리) */}
        <section className="space-y-3">
          <div className="bg-white rounded-[28px] p-4 border border-gray-100 shadow-[0_8px_22px_rgba(0,0,0,0.04)]">
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex-1 text-left">
                <div className="text-[16px] font-extrabold text-[#1a1a1a]">학원 답변</div>
                <div className="text-[12px] font-bold text-gray-400 mt-1">
                  학원에서 보낸 답변만 모아서 확인할 수 있어요.
                </div>
              </div>

              <div className="text-[12px] font-extrabold text-[#6344d4] ml-4 flex-shrink-0">
                {replyOpen ? "닫기" : `보기 (${replyDates.reduce((n, d) => n + (repliesByDate[d]?.length || 0), 0)})`}
              </div>
            </button>

            {replyOpen && (
              <div className="mt-4 space-y-4">
                {replyDates.length === 0 ? (
                  <div className="text-[13px] text-gray-400 font-semibold text-center py-6">
                    아직 학원 답변이 없습니다.
                  </div>
                ) : (
                  replyDates.map((date) => {
                    const list = repliesByDate[date] || []
                    const isToday = date === today

                    return (
                      <div key={date} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[13px] font-extrabold text-gray-600">
                            {date}
                            {isToday && (
                              <span className="ml-2 px-2 py-1 rounded-full bg-blue-50 text-blue-500 text-[11px] font-extrabold">
                                오늘
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] font-bold text-gray-300">{list.length}건</div>
                        </div>

                        <div className="space-y-2">
                          {list.map((r) => (
                            <div
                              key={r.id}
                              className="rounded-[20px] border border-purple-100 bg-purple-50 px-4 py-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-[12px] font-extrabold text-[#6344d4]">
                                  {actionTypeLabel(r.actionType)}
                                </div>
                                <div className="text-[11px] font-bold text-gray-400">
                                  {formatKST(r.repliedAt)}
                                </div>
                              </div>

                              <div className="mt-2 text-[14px] font-semibold text-gray-700 whitespace-pre-line">
                                {r.replyMessage}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </section>

        {/* 오늘 수업 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-extrabold text-[#1a1a1a]">오늘 수업</h2>

            <span className="px-3 h-9 inline-flex items-center rounded-2xl bg-[#6344d4] text-white text-[13px] font-extrabold">
              {todayRecord?.attendance || "미기록"}
            </span>
          </div>

          <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-[0_8px_22px_rgba(0,0,0,0.04)]">
            {todayRecord ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[22px] bg-[#f6f7fb] border border-gray-100 flex items-center justify-center text-[34px]">
                  {todayRecord.emoji}
                </div>

                <div className="flex-1">
                  <div className="text-[13px] text-gray-400 font-bold">{todayRecord.date}</div>
                  <div className="text-[20px] font-extrabold text-[#1a1a1a]">{todayRecord.feedback}</div>
                </div>
              </div>
            ) : (
              <div className="text-[14px] text-gray-400 font-semibold">오늘 출결/피드백 기록이 아직 없습니다.</div>
            )}
          </div>
        </section>

        {/* 학원에 바로 전달하기 */}
        <section className="space-y-3">
          <h3 className="text-[18px] font-extrabold text-[#1a1a1a]">학원에 바로 전달하기</h3>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onAction("absent")}
              className="bg-white rounded-[26px] p-4 border border-gray-100 shadow-sm active:scale-[0.99]"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-2">
                <span className="text-[22px]">✖</span>
              </div>
              <div className="text-center text-[15px] font-extrabold text-red-500">결석</div>
            </button>

            <button
              type="button"
              onClick={() => onAction("late")}
              className="bg-white rounded-[26px] p-4 border border-gray-100 shadow-sm active:scale-[0.99]"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-2">
                <span className="text-[22px]">🕒</span>
              </div>
              <div className="text-center text-[15px] font-extrabold text-amber-500">지각</div>
            </button>

            <button
              type="button"
              onClick={() => onAction("ask")}
              className="rounded-[26px] p-4 border border-gray-100 shadow-sm active:scale-[0.99]
                         bg-gradient-to-b from-[#6f55da] to-[#5b3fd0]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-2">
                <span className="text-[22px]">💬</span>
              </div>
              <div className="text-center text-[15px] font-extrabold text-white">문의</div>
            </button>
          </div>
        </section>

        {/* 최근 기록 */}
        <section className="space-y-3">
          <h3 className="text-[18px] font-extrabold text-[#1a1a1a]">최근 기록</h3>

          <div className="space-y-3">
            {recentRecords.length === 0 ? (
              <div className="bg-white rounded-[28px] px-5 py-4 border border-gray-100 shadow-sm text-center text-gray-400 text-[14px]">
                기록이 없습니다.
              </div>
            ) : (
              recentRecords.map((r, idx) => {
                const isToday = r.date === today
                return (
                  <div
                    key={`${r.date}-${idx}`}
                    className="bg-white rounded-[28px] px-5 py-4 border border-gray-100 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-[22px] bg-[#f6f7fb] border border-gray-100 flex items-center justify-center text-[30px]">
                        {r.emoji}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-[18px] font-extrabold text-[#1a1a1a]">{r.feedback}</div>

                          {isToday && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-500 text-[12px] font-extrabold">
                              오늘
                            </span>
                          )}
                        </div>

                        <div className="text-[13px] text-gray-400 font-bold">날짜: {r.date}</div>
                      </div>

                      <div className="text-[14px] font-bold text-gray-400">{r.attendance}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-4 text-center text-[13px] text-gray-400 font-semibold">
            문제가 계속되면 학원에 문의해주세요.
          </div>
        </section>

        <div className="h-10" />
      </div>
    </div>
  )
}