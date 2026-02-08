import { useMemo, useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, Filter, MessageSquare, ChevronRight, User, X } from "lucide-react"
import AcademyHeader from "../components/AcademyHeader"
import { supabase } from "../lib/supabase"

type FeedStatus = "상담중" | "답변완료" | "대기중"

interface FeedItem {
  id: string
  studentName: string
  parentName: string
  lastMessage: string
  time: string
  unreadCount: number
  status: FeedStatus
  tag: string

  // detail용
  createdAtISO: string
  actionType: string
  replyMessage?: string | null
  repliedAt?: string | null
}

function statusPillClass(status: FeedStatus) {
  switch (status) {
    case "상담중":
      return "bg-amber-50 text-amber-600 border-amber-100"
    case "답변완료":
      return "bg-emerald-50 text-emerald-600 border-emerald-100"
    case "대기중":
      return "bg-blue-50 text-blue-600 border-blue-100"
    default:
      return "bg-gray-50 text-gray-500 border-gray-100"
  }
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function formatTimeAgo(dateISO: string): string {
  const now = new Date()
  const past = new Date(dateISO)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "방금 전"
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays === 1) return "어제"
  if (diffDays < 7) return `${diffDays}일 전`
  return past.toLocaleDateString("ko-KR")
}

function actionTypeToTag(actionType: string): string {
  if (actionType === "absent") return "결석공지"
  if (actionType === "late") return "지각공지"
  if (actionType === "ask") return "문의"
  return "기타"
}

function deriveStatus(actionType: string, repliedAt?: string | null, replyMessage?: string | null): FeedStatus {
  if (repliedAt || (replyMessage && replyMessage.trim().length > 0)) return "답변완료"
  // ask는 "대기중" 느낌
  if (actionType === "ask") return "대기중"
  // absent/late 등은 상담중으로
  return "상담중"
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[640px] rounded-[28px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.18)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="text-[16px] font-extrabold text-[#1a1a1a]">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-full grid place-items-center bg-gray-50 active:scale-[0.98]"
              aria-label="close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function ConsultationFeedPage() {
  const [sp, setSp] = useSearchParams()

  const [searchQuery, setSearchQuery] = useState("")
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  // 모달/선택
  const openId = sp.get("open") || ""
  const selected = useMemo(() => feedItems.find((x) => x.id === openId) || null, [feedItems, openId])

  // 답변 입력
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    // openId 바뀌면 replyText 초기화(기존 답변 있으면 채움)
    if (selected) setReplyText(selected.replyMessage ?? "")
    else setReplyText("")
  }, [selected])

  useEffect(() => {
    const loadFeedItems = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("parent_actions")
          .select(
            `
            id,
            created_at,
            action_type,
            message,
            reply_message,
            replied_at,
            students (
              name
            )
          `
          )
          .order("created_at", { ascending: false })

        if (error) throw error

        const transformed: FeedItem[] = (data || []).map((item: any) => {
          const createdAtISO = item.created_at as string
          const actionType = item.action_type as string
          const replyMessage = item.reply_message as string | null | undefined
          const repliedAt = item.replied_at as string | null | undefined

          return {
            id: item.id,
            studentName: item.students?.name || "알 수 없음",
            parentName: "학부모",
            lastMessage: item.message || "",
            time: formatTimeAgo(createdAtISO),
            unreadCount: 0,
            status: deriveStatus(actionType, repliedAt, replyMessage),
            tag: actionTypeToTag(actionType),

            createdAtISO,
            actionType,
            replyMessage,
            repliedAt,
          }
        })

        setFeedItems(transformed)
      } catch (e: any) {
        console.error("상담 피드 로드 실패:", e)
        setFeedItems([])
      } finally {
        setLoading(false)
      }
    }

    loadFeedItems()
  }, [])

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return feedItems
    return feedItems.filter(
      (x) =>
        x.studentName.includes(q) ||
        x.parentName.includes(q) ||
        x.tag.includes(q) ||
        x.lastMessage.includes(q)
    )
  }, [feedItems, searchQuery])

  const openItem = (id: string) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev)
      next.set("open", id)
      return next
    })
  }

  const closeModal = () => {
    setSp((prev) => {
      const next = new URLSearchParams(prev)
      next.delete("open")
      return next
    })
  }

  const onFilter = () => alert("필터(추후)")
  const onNew = () => alert("새 상담(추후)")

  const sendReply = async () => {
    if (!selected) return
    const text = replyText.trim()
    if (!text) {
      alert("답변 내용을 입력해주세요")
      return
    }

    console.log("🔄 [sendReply] 시작", { actionId: selected.id, replyText: text })

    try {
      setSending(true)

      const repliedAt = new Date().toISOString()

      // ✅ parent_actions에 답변 저장
      const { data, error } = await supabase
        .from("parent_actions")
        .update({
          reply_message: text,
          replied_at: repliedAt,
          status: "답변완료",
        })
        .eq("id", selected.id)
        .select("id")
        .maybeSingle()

      console.log("UPDATE result:", data, error)

      if (error) {
        console.error("❌ [sendReply] UPDATE 실패", error)
        throw error
      }

      if (!data) {
        throw new Error("UPDATE 0 rows (RLS 정책 또는 id 불일치)")
      }

      console.log("✅ [sendReply] UPDATE 성공", data)

      // ✅ UI 즉시 반영 (낙관적 업데이트)
      setFeedItems((prev) =>
        prev.map((x) =>
          x.id === selected.id
            ? {
                ...x,
                replyMessage: text,
                repliedAt: repliedAt,
                status: "답변완료",
                unreadCount: 0,
              }
            : x
        )
      )

      closeModal()
    } catch (e) {
      console.error("❌ [sendReply] 예외 발생", e)
      alert("답변 전송 실패")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f8f9fc]">
      <AcademyHeader />

      {/* 컨테이너 */}
      <div className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-6">
        {/* 타이틀 */}
        <div className="space-y-2">
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#1a1a1a]">학부모 상담 피드</h1>
          <p className="text-[13px] leading-relaxed text-gray-400">
            학부모님들과 주고받은 메시지와 상담 내역을 관리합니다.
          </p>
        </div>

        {/* 검색 + 필터 */}
        <div className="mt-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-300" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="학생 또는 학부모 이름 검색"
              className={cx(
                "h-14 w-full rounded-[22px] border border-gray-200 bg-white",
                "pl-14 pr-4 text-[15px] font-semibold text-gray-700",
                "placeholder:text-gray-300",
                "outline-none transition",
                "focus:border-[#6344d4] focus:ring-2 focus:ring-purple-100"
              )}
            />
          </div>

          <button
            type="button"
            onClick={onFilter}
            className={cx(
              "h-14 w-14 rounded-[22px] border border-gray-200 bg-white",
              "grid place-items-center active:scale-[0.98]"
            )}
            aria-label="filter"
          >
            <Filter className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        {/* 리스트 */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-[28px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gray-50">
                <MessageSquare className="h-7 w-7 text-gray-300 animate-pulse" />
              </div>
              <p className="text-[14px] font-semibold text-gray-400">불러오는 중...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              // ✅ nested button 문제 방지: 카드 컨테이너는 div + onClick
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => openItem(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openItem(item.id)
                }}
                className={cx(
                  "w-full text-left cursor-pointer",
                  "rounded-[28px] border border-gray-100 bg-white",
                  "shadow-[0_4px_18px_rgba(0,0,0,0.03)]",
                  "px-5 py-5",
                  "active:scale-[0.99] transition",
                  "outline-none focus:ring-2 focus:ring-purple-100"
                )}
              >
                {/* 상단 라인 */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-11 w-11 place-items-center rounded-full bg-[#f2efff]">
                      <User className="h-5 w-5 text-[#6344d4]" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[16px] font-extrabold text-[#1a1a1a]">
                          {item.studentName}
                        </span>
                        <span className="text-[14px] font-semibold text-gray-400">
                          ({item.parentName} 학부모님)
                        </span>
                      </div>
                      <div className="text-[12px] font-bold text-gray-200">{item.time}</div>
                    </div>
                  </div>

                  <span
                    className={cx(
                      "inline-flex items-center rounded-full border px-3 py-1",
                      "text-[12px] font-extrabold",
                      statusPillClass(item.status)
                    )}
                  >
                    {item.status}
                  </span>
                </div>

                {/* 메시지 */}
                <div className="relative mt-4 rounded-[22px] bg-[#f3f4f7] px-5 py-4">
                  <p className="text-[15px] font-semibold leading-relaxed text-gray-600 line-clamp-2">
                    {item.lastMessage}
                  </p>

                  {item.unreadCount > 0 && (
                    <div className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-[12px] font-extrabold text-white shadow-sm">
                      {item.unreadCount}
                    </div>
                  )}
                </div>

                {/* 하단 */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full bg-gray-100 px-3 py-2 text-[12px] font-extrabold text-gray-500">
                    #{item.tag}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openItem(item.id)
                    }}
                    className="flex items-center gap-1 text-[14px] font-extrabold text-[#6344d4] hover:opacity-80 active:opacity-60 transition"
                  >
                    <span>답변 / 기록</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gray-50">
                <MessageSquare className="h-7 w-7 text-gray-300" />
              </div>
              <p className="text-[14px] font-semibold text-gray-400">
                아직 등록된 상담 내역이 없습니다.
                <br />
                학부모와의 소통이 시작되면 여기에 기록 됩니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={onNew}
        className={cx(
          "fixed bottom-6 right-6",
          "h-16 w-16 rounded-full bg-[#6344d4]",
          "shadow-[0_16px_30px_rgba(99,68,212,0.25)]",
          "grid place-items-center",
          "active:scale-[0.98] transition"
        )}
        aria-label="new message"
      >
        <MessageSquare className="h-7 w-7 text-white" />
      </button>

      {/* ✅ 모달 */}
      <Modal open={!!selected} title="답변 / 기록" onClose={closeModal}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[16px] font-extrabold text-[#1a1a1a]">{selected.studentName}</div>
                <div className="text-[12px] text-gray-400 font-bold">{formatTimeAgo(selected.createdAtISO)}</div>
              </div>
              <span
                className={cx(
                  "inline-flex items-center rounded-full border px-3 py-1",
                  "text-[12px] font-extrabold",
                  statusPillClass(selected.status)
                )}
              >
                {selected.status}
              </span>
            </div>

            <div className="rounded-[22px] bg-[#f3f4f7] px-5 py-4">
              <div className="text-[12px] font-extrabold text-gray-400 mb-2">학부모 메시지</div>
              <div className="text-[15px] font-semibold text-gray-700 whitespace-pre-wrap">
                {selected.lastMessage || "-"}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[12px] font-extrabold text-gray-400">답변</div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="학부모님께 보낼 답변을 입력하세요"
                className="w-full h-28 rounded-[20px] border border-gray-200 p-4 outline-none
                           focus:border-[#6344d4] focus:ring-2 focus:ring-purple-100
                           text-[14px] font-semibold text-gray-700 placeholder:text-gray-300"
              />
            </div>

            {/* ✅ 버튼 하나로 통일(보라색) */}
            <button
              type="button"
              disabled={sending}
              onClick={sendReply}
              className={cx(
                "mt-2 w-full h-12 rounded-[22px]",
                "bg-[#6344d4] text-white font-extrabold",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                "active:scale-[0.98] transition"
              )}
            >
              {sending ? "전송 중..." : "답변 전송"}
            </button>

            <div className="text-[12px] text-gray-400 font-semibold text-center pt-1">
              전송하면 “답변완료”로 변경됩니다.
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}