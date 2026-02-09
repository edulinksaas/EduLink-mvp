import { useEffect, useMemo, useState } from "react"
import AcademyHeader from "../components/AcademyHeader"
import { supabase } from "../lib/supabase"

type AttendanceStatus = "present" | "absent" | "unmarked"
type FeedbackCode = "good" | "normal" | "low" | "need" | null

type Class = {
  id: string
  name: string
}

type StudentRow = {
  id: string
  name: string
}

type TodayRow = {
  studentId: string
  studentName: string
  status: AttendanceStatus
  feedback: FeedbackCode
}

function getTodayDateKST(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

// ✅ 토큰 생성(충돌 확률 극저) - 브라우저 crypto 사용
function makeToken(len = 28) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

export default function AcademyAttendancePage() {
  // 반 검색 및 선택
  const [classQuery, setClassQuery] = useState("")
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [loadingClasses, setLoadingClasses] = useState(false)

  // 학생 검색 및 선택
  const [studentQuery, setStudentQuery] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedStudentName, setSelectedStudentName] = useState<string>("")

  // 폼 상태
  const [attendance, setAttendance] = useState<"present" | "absent" | null>(null)
  const [feedback, setFeedback] = useState<FeedbackCode>(null)

  // 리스트 데이터
  const [todayRows, setTodayRows] = useState<TodayRow[]>([])
  const [loading, setLoading] = useState(true)

  // ✅ 학부모 링크 상태
  const [parentLink, setParentLink] = useState<string>("")
  const [linkLoading, setLinkLoading] = useState(false)

  const today = useMemo(() => getTodayDateKST(), [])

  // 1) academyId 구하기
  const getAcademyId = async (): Promise<string> => {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw new Error("로그인이 필요합니다.")
    const userId = userData.user.id

    const { data: academyUsers, error: auError } = await supabase
      .from("academy_users")
      .select("academy_id")
      .eq("user_id", userId)

    if (auError) throw new Error("academy_users 조회 실패")
    const academyId = academyUsers?.[0]?.academy_id

    if (!academyId || typeof academyId !== "string" || academyId.trim() === "") {
      throw new Error("소속된 학원을 찾을 수 없습니다.")
    }
    return academyId
  }

  // 반 목록 로드
  const loadClasses = async (academyId: string) => {
    try {
      setLoadingClasses(true)
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("academy_id", academyId)
        .order("name", { ascending: true })

      if (error) throw error
      setClasses(data || [])
    } catch (e: any) {
      console.error("반 목록 로드 실패:", e)
      alert(e?.message || "반 목록을 불러오는데 실패했습니다.")
    } finally {
      setLoadingClasses(false)
    }
  }

  // 학생 목록 로드 (선택된 반 기준)
  const loadStudents = async (academyId: string, classId?: string) => {
    try {
      if (!classId) {
        setTodayRows([])
        return
      }

      // class_students를 통해 해당 반의 학생들 조회
      const { data: classStudentsData, error: csError } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", classId)

      if (csError) throw csError

      const studentIds = (classStudentsData || []).map((cs: any) => cs.student_id)
      if (studentIds.length === 0) {
        setTodayRows([])
        return
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name")
        .in("id", studentIds)
        .eq("academy_id", academyId)
        .order("name", { ascending: true })

      if (studentsError) throw studentsError

      const studentRows: StudentRow[] = (studentsData || [])
        .filter((s: any) => s?.id && s?.name)
        .map((s: any) => ({ id: s.id, name: s.name }))

      // 오늘 출석기록도 함께 로드
      const { data: recordsData, error: recordsError } = await supabase
        .from("attendance_records")
        .select("student_id, status, feedback_code, record_date")
        .eq("record_date", today)
        .in("student_id", studentIds)

      if (recordsError) throw recordsError

      const recordMap = new Map<
        string,
        { status?: string | null; feedback_code?: string | null }
      >()

      ;(recordsData || []).forEach((r: any) => {
        recordMap.set(r.student_id, {
          status: r.status ?? null,
          feedback_code: r.feedback_code ?? null,
        })
      })

      const merged: TodayRow[] = studentRows.map((s) => {
        const rec = recordMap.get(s.id)
        const status =
          rec?.status === "present"
            ? "present"
            : rec?.status === "absent"
              ? "absent"
              : "unmarked"

        const fb =
          rec?.feedback_code === "good" ||
          rec?.feedback_code === "normal" ||
          rec?.feedback_code === "low" ||
          rec?.feedback_code === "need"
            ? (rec.feedback_code as FeedbackCode)
            : null

        return {
          studentId: s.id,
          studentName: s.name,
          status,
          feedback: fb,
        }
      })

      setTodayRows(merged)
    } catch (e: any) {
      console.error("학생 목록 로드 실패:", e)
      alert(e?.message || "학생 목록을 불러오는데 실패했습니다.")
      setTodayRows([])
    }
  }

  // 초기 로드
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const academyId = await getAcademyId()
        await loadClasses(academyId)
      } catch (e: any) {
        console.error("초기 데이터 로드 실패:", e)
        alert(e?.message || "데이터를 불러오는데 실패했습니다.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  // 선택된 반이 변경되면 학생 목록 로드
  useEffect(() => {
    if (!selectedClassId) {
      setTodayRows([])
      setSelectedStudentId(null)
      setSelectedStudentName("")
      setParentLink("")
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        const academyId = await getAcademyId()
        await loadStudents(academyId, selectedClassId)
        // 반 변경 시 선택된 학생 초기화
        setSelectedStudentId(null)
        setSelectedStudentName("")
        setAttendance(null)
        setFeedback(null)
        setParentLink("")
      } catch (e: any) {
        console.error("학생 목록 로드 실패:", e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [selectedClassId, today])

  // 필터된 반 목록 (최대 8개)
  const filteredClasses = useMemo(() => {
    const query = classQuery.trim().toLowerCase()
    if (!query) return []
    return classes
      .filter((c) => c.name.toLowerCase().includes(query))
      .slice(0, 8)
  }, [classes, classQuery])

  // 필터된 학생 목록 (선택된 반의 학생들만)
  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase()
    if (!query) return todayRows
    return todayRows.filter((r) => r.studentName.toLowerCase().includes(query))
  }, [todayRows, studentQuery])

  // 선택된 반 이름
  const selectedClassName = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId)?.name || ""
  }, [classes, selectedClassId])

  // ✅ (추가) 선택한 학생의 최신 parent token 조회 → 링크로 만들기
  const loadParentLink = async (studentId: string) => {
    try {
      setLinkLoading(true)

      const { data, error } = await supabase
        .from("parent_tokens")
        .select("token, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (!data?.token) {
        setParentLink("")
        return
      }

      const link = `${window.location.origin}/p/${data.token}`
      setParentLink(link)
    } catch (e) {
      console.error("부모 링크 조회 실패:", e)
      setParentLink("")
    } finally {
      setLinkLoading(false)
    }
  }

  const createParentLink = async () => {
    try {
      if (!selectedStudentId) {
        alert("학생을 선택해주세요.")
        return
      }

      setLinkLoading(true)

      // 1) 기존 토큰 조회
      const { data: existingToken, error: queryError } = await supabase
        .from("parent_tokens")
        .select("token")
        .eq("student_id", selectedStudentId)
        .maybeSingle()

      if (queryError) throw queryError

      let token: string

      if (existingToken?.token) {
        token = existingToken.token
      } else {
        token = makeToken(28)
        const { error: upsertError } = await supabase
          .from("parent_tokens")
          .upsert(
            {
              token,
              student_id: selectedStudentId,
            },
            {
              onConflict: "student_id",
            }
          )

        if (upsertError) {
          const { data: retryData, error: retryError } = await supabase
            .from("parent_tokens")
            .select("token")
            .eq("student_id", selectedStudentId)
            .maybeSingle()

          if (retryError) throw retryError
          if (!retryData?.token) throw new Error("토큰 생성에 실패했습니다.")

          token = retryData.token
        }
      }

      const link = `${window.location.origin}/p/${token}`
      setParentLink(link)
    } catch (e: any) {
      console.error("링크 생성 실패:", e)
      const errorMessage =
        e?.code === "23505" || e?.message?.includes("duplicate")
          ? "이미 링크가 생성되어 있습니다."
          : "링크 생성 실패."
      alert(errorMessage)
    } finally {
      setLinkLoading(false)
    }
  }

  // ✅ (추가) 링크 복사
  const copyParentLink = async () => {
    try {
      if (!parentLink) {
        alert("먼저 링크를 생성/조회해주세요.")
        return
      }
      await navigator.clipboard.writeText(parentLink)
      alert("링크 복사 완료!")
    } catch (e) {
      console.error("복사 실패:", e)
      alert("복사 실패. (브라우저 권한/HTTPS 확인)")
    }
  }

  const onPickStudent = async (row: TodayRow) => {
    setSelectedStudentId(row.studentId)
    setSelectedStudentName(row.studentName)

    if (row.status === "present" || row.status === "absent") {
      setAttendance(row.status)
    } else {
      setAttendance(null)
    }
    setFeedback(row.feedback)

    await loadParentLink(row.studentId)
  }

  const badge = (status: AttendanceStatus) => {
    if (status === "present") return { text: "출석", cls: "bg-green-100 text-green-700" }
    if (status === "absent") return { text: "결석", cls: "bg-red-100 text-red-700" }
    return { text: "미기록", cls: "bg-gray-100 text-gray-600" }
  }

  const saveToday = async () => {
    try {
      if (!selectedStudentId) {
        alert("학생을 선택해주세요.")
        return
      }
      if (!attendance) {
        alert("출석/결석을 선택해주세요.")
        return
      }

      const payload = {
        student_id: selectedStudentId,
        record_date: today,
        status: attendance,
        feedback_code: feedback,
      }

      const { error } = await supabase
        .from("attendance_records")
        .upsert(payload, { onConflict: "student_id,record_date" })

      if (error) throw error

      setTodayRows((prev) =>
        prev.map((r) =>
          r.studentId === selectedStudentId ? { ...r, status: attendance, feedback } : r
        )
      )

      alert("저장 완료!")
    } catch (e) {
      console.error("저장 실패:", e)
      alert("저장 실패. 콘솔 확인해줘.")
    }
  }

  const AttendanceList = () => (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-gray-900">학생 검색</h2>
        {loading && <span className="text-[12px] text-gray-500">불러오는 중...</span>}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {!selectedClassId ? (
          <div className="p-4 text-[13px] text-gray-500">반을 먼저 선택해주세요.</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-4 text-[13px] text-gray-500">학생이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[240px] overflow-y-auto">
            {filteredStudents.map((r) => {
              const b = badge(r.status)
              const isActive = r.studentId === selectedStudentId
              return (
                <li
                  key={r.studentId}
                  onClick={() => onPickStudent(r)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer
                    ${isActive ? "bg-[#ede9fe]" : "bg-white"}
                  `}
                >
                  <span className="text-[14px] font-medium text-gray-900">
                    {r.studentName}
                  </span>

                  <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${b.cls}`}>
                    {b.text}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )

  return (
    <div className="min-h-screen w-full bg-[#f8f9fc] flex flex-col font-sans">
      <AcademyHeader />

      <main className="max-w-[1200px] mx-auto w-full p-4 sm:p-6">
        {/* 제목 */}
        <section className="space-y-2 mb-6">
          <h1 className="text-[20px] font-bold text-gray-900">학원 출결 기록</h1>
          <p className="text-[13px] text-gray-500">
            출결과 피드백을 기록하고 학부모에게 공유합니다. (오늘: {today})
          </p>
        </section>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* 왼쪽 */}
          <div className="flex-1 space-y-8">
            {/* 반 이름 검색 */}
            <section className="space-y-2">
              <label className="text-[13px] font-medium text-gray-700">반 이름 검색</label>
              <div className="relative">
                <input
                  value={classQuery}
                  onChange={(e) => setClassQuery(e.target.value)}
                  placeholder="반 이름을 입력하세요"
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 text-[14px]
                             focus:outline-none focus:ring-2 focus:ring-[#6344d4]/30"
                />
                {classQuery && filteredClasses.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[200px] overflow-y-auto">
                    {filteredClasses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClassId(c.id)
                          setClassQuery("")
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[14px] font-medium text-gray-900"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedClassId && (
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="text-green-600 font-medium">선택됨: {selectedClassName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClassId("")
                      setClassQuery("")
                      setSelectedStudentId(null)
                      setSelectedStudentName("")
                      setAttendance(null)
                      setFeedback(null)
                      setParentLink("")
                    }}
                    className="text-red-500 hover:text-red-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {loadingClasses && (
                <div className="text-[12px] text-gray-500">반 목록 불러오는 중...</div>
              )}
            </section>

            {/* 학생 이름 검색 */}
            <section className="space-y-2">
              <label className="text-[13px] font-medium text-gray-700">학생 이름 검색</label>
              <input
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder={selectedClassId ? "학생 이름을 입력하세요" : "먼저 반을 선택해주세요"}
                disabled={!selectedClassId}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 text-[14px]
                           focus:outline-none focus:ring-2 focus:ring-[#6344d4]/30
                           disabled:bg-gray-100 disabled:text-gray-400"
              />

              {selectedStudentId && (
                <div className="text-[13px] text-green-600 flex items-center gap-1">
                  ✅ 선택됨: {selectedStudentName}
                </div>
              )}
            </section>

            {/* 모바일용 학생 검색 목록 */}
            <div className="lg:hidden">
              <AttendanceList />
            </div>

            {/* ✅ 학부모 공유 링크 */}
            <section className="space-y-3">
              <label className="text-[13px] font-medium text-gray-700">학부모 공유 링크</label>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!selectedStudentId || linkLoading}
                  onClick={createParentLink}
                  className={`flex-1 h-11 rounded-xl text-white font-bold text-[13px]
                    ${!selectedStudentId || linkLoading ? "bg-gray-300" : "bg-[#6344d4] hover:bg-[#5235b5]"}
                  `}
                >
                  {linkLoading ? "처리 중..." : "링크 생성하기"}
                </button>

                <button
                  type="button"
                  disabled={!parentLink}
                  onClick={copyParentLink}
                  className={`flex-1 h-11 rounded-xl font-bold text-[13px]
                    ${parentLink ? "bg-[#ede9fe] text-[#6344d4]" : "bg-gray-200 text-gray-400"}
                  `}
                >
                  링크 복사
                </button>
              </div>

              <input
                value={parentLink || ""}
                readOnly
                placeholder={
                  selectedStudentId
                    ? linkLoading
                      ? "링크 불러오는 중..."
                      : "링크가 없으면 생성하세요"
                    : "학생을 먼저 선택하세요"
                }
                className="w-full h-11 px-4 rounded-xl border border-gray-200
                           bg-gray-50 text-[13px]"
              />
            </section>

            {/* 출석 / 결석 */}
            <section className="space-y-3">
              <label className="text-[13px] font-medium text-gray-700">출석 상태</label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAttendance("present")}
                  className={`flex-1 h-11 rounded-xl font-bold text-[14px]
                    ${attendance === "present" ? "bg-green-500 text-white" : "bg-green-100 text-green-700"}`}
                >
                  출석
                </button>

                <button
                  type="button"
                  onClick={() => setAttendance("absent")}
                  className={`flex-1 h-11 rounded-xl font-bold text-[14px]
                    ${attendance === "absent" ? "bg-red-500 text-white" : "bg-red-100 text-red-700"}`}
                >
                  결석
                </button>
              </div>
            </section>

            {/* 오늘의 피드백 */}
            <section className="space-y-3">
              <label className="text-[13px] font-medium text-gray-700">오늘의 피드백</label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFeedback("good")}
                  className={`h-11 rounded-xl text-[13px] font-bold
                    ${feedback === "good" ? "bg-green-500 text-white" : "bg-green-100 text-green-700"}`}
                >
                  😊 집중 잘함
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback("normal")}
                  className={`h-11 rounded-xl text-[13px] font-bold
                    ${feedback === "normal" ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700"}`}
                >
                  🙂 보통
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback("low")}
                  className={`h-11 rounded-xl text-[13px] font-bold
                    ${feedback === "low" ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-700"}`}
                >
                  😓 컨디션 저조
                </button>

                <button
                  type="button"
                  onClick={() => setFeedback("need")}
                  className={`h-11 rounded-xl text-[13px] font-bold
                    ${feedback === "need" ? "bg-red-500 text-white" : "bg-red-100 text-red-700"}`}
                >
                  ⚠️ 지도 필요
                </button>
              </div>
            </section>

            {/* 저장 */}
            <section>
              <button
                type="button"
                onClick={saveToday}
                disabled={!selectedStudentId}
                className={`w-full h-12 rounded-xl font-bold text-[15px]
                  ${selectedStudentId ? "bg-[#6344d4] text-white hover:bg-[#5235b5]" : "bg-gray-300 text-gray-500 cursor-not-allowed"}
                `}
              >
                오늘 출결 저장
              </button>
            </section>
          </div>

          {/* 오른쪽 (데스크톱용 학생 검색 목록) */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <AttendanceList />
          </div>
        </div>
      </main>
    </div>
  )
}
