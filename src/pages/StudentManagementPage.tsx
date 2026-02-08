import React, { useMemo, useState, useEffect } from "react"
import AcademyHeader from "../components/AcademyHeader"
import { supabase } from "../lib/supabase"
import {
  Search,
  UserCircle,
  Link2,
  Link2Off,
  Edit2,
  UserMinus,
  UserCheck,
  MessageSquare,
  ArrowLeft,
} from "lucide-react"

type StudentStatus = "active" | "withdrawn"

type Student = {
  id: string
  name: string
  className: string
  status: StudentStatus
  memo: string
  parentConnected: boolean
  lastAttendance: string
}

function Badge({ variant, children }: { variant: "active" | "withdrawn"; children: React.ReactNode }) {
  const cls =
    variant === "active"
      ? "bg-purple-50 text-[#6344d4]"
      : "bg-gray-100 text-gray-400"
  return (
    <span className={`inline-flex items-center border-0 text-[10px] h-4 px-1.5 rounded-md font-bold ${cls}`}>
      {children}
    </span>
  )
}

function toastLite(msg: string) {
  // ✅ sonner 같은 라이브러리 없이 최소 토스트(원하면 나중에 교체)
  // 너무 거슬리면 alert로 바꿔도 됨.
  console.log(msg)
}

export default function StudentManagementPage() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<StudentStatus>("active")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editMemo, setEditMemo] = useState("")

  // ✅ 로그인한 유저의 academy_id로 students 조회
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true)

        // 1. 현재 로그인한 유저 가져오기
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) {
          throw new Error("로그인이 필요합니다.")
        }

        const userId = userData.user.id

        // 2. academy_users에서 academy_id 조회
        const { data: academyUsers, error: auError } = await supabase
          .from("academy_users")
          .select("academy_id")
          .eq("user_id", userId)

        if (auError) {
          throw new Error("학원 정보 조회 실패")
        }

        // 3. academyId 추출 및 검증
        const academyId = academyUsers?.[0]?.academy_id

        // academyId가 없으면 students 쿼리 실행 금지
        if (!academyId || typeof academyId !== "string" || academyId.trim() === "") {
          console.error("❌ academyId가 유효하지 않음:", academyId)
          throw new Error("소속된 학원을 찾을 수 없습니다.")
        }

        // 4. academyId가 확실히 존재할 때만 students 조회 실행
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select(`
            id,
            name,
            class_students (
              classes (
                name
              )
            )
          `)
          .eq("academy_id", academyId)

        if (studentsError) {
          console.error("학생 조회 에러:", studentsError)
          throw studentsError
        }

        // 5. 데이터 변환: DB 스키마를 Student 타입으로 매핑
        const transformedStudents: Student[] = (studentsData || []).map((s: any) => {
          // 첫 번째 반 이름 가져오기 (여러 반에 속할 수 있지만 첫 번째만 표시)
          const className = s.class_students?.[0]?.classes?.name || "미배정"

          return {
            id: s.id,
            name: s.name || "",
            className: className,
            status: "active", // 기본값으로 active 설정 (DB에 status 컬럼 없음)
            memo: "", // DB에 memo 컬럼 없음
            parentConnected: false, // TODO: parent 연결 정보가 있으면 추가
            lastAttendance: "", // TODO: 출결 기록에서 최근 날짜 가져오기
          }
        })

        setStudents(transformedStudents)
      } catch (e: any) {
        console.error("학생 목록 로드 실패:", e)
        toastLite(e.message || "학생 목록을 불러오는데 실패했습니다.")
        setStudents([]) // 에러 발생 시 빈 배열로 설정
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [])

  const toggleStatus = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const newStatus: StudentStatus = s.status === "active" ? "withdrawn" : "active"
        toastLite(`${s.name} 학생이 ${newStatus === "active" ? "재원" : "퇴원"} 상태로 변경`)
        return { ...s, status: newStatus }
      })
    )
  }

  const startEdit = (student: Student) => {
    setEditingId(student.id)
    setEditName(student.name)
    setEditMemo(student.memo)
  }

  const saveEdit = () => {
    if (!editingId) return
    setStudents((prev) =>
      prev.map((s) => (s.id === editingId ? { ...s, name: editName.trim() || s.name, memo: editMemo } : s))
    )
    setEditingId(null)
    toastLite("학생 정보 수정 완료")
  }

  const filteredStudents = useMemo(() => {
    const q = search.trim()
    return students.filter((s) => {
      const matchesSearch = q === "" || s.name.includes(q) || s.className.includes(q)
      const matchesFilter = s.status === filter
      return matchesSearch && matchesFilter
    })
  }, [students, search, filter])

  // =======================
  // Detail View (간단 버전)
  // =======================
  if (selectedStudent) {
    return (
      <div className="min-h-screen w-full bg-[#f8f9fc] flex flex-col font-sans">
        <AcademyHeader />

        <main className="max-w-[560px] w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
          <button
            type="button"
            onClick={() => setSelectedStudent(null)}
            className="inline-flex items-center gap-2 text-[13px] font-bold text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </button>

          <div className="bg-white rounded-[24px] border border-gray-100 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                <UserCircle className="w-7 h-7 text-[#6344d4]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[18px] font-extrabold text-[#1a1a1a]">{selectedStudent.name}</div>
                  <Badge variant={selectedStudent.status}>{selectedStudent.status === "active" ? "재원중" : "퇴원"}</Badge>
                  {selectedStudent.parentConnected ? (
                    <Link2 className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Link2Off className="w-4 h-4 text-gray-300" />
                  )}
                </div>
                <div className="text-[12px] text-gray-400 font-medium">{selectedStudent.className}</div>
              </div>
            </div>

            <div className="bg-[#f8f9fc] p-3 rounded-xl border border-gray-50/50">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-gray-300 mt-0.5" />
                <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
                  {selectedStudent.memo || "기록된 메모가 없습니다."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-400 font-bold tracking-wider">
                최근 출결: {selectedStudent.lastAttendance}
              </span>
              <span className="text-[11px] text-gray-400 font-bold">
                학부모 {selectedStudent.parentConnected ? "연결됨" : "미연결"}
              </span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // =======================
  // List View
  // =======================
  return (
    <div className="min-h-screen w-full bg-[#f8f9fc] flex flex-col font-sans">
      <AcademyHeader />

      <main className="max-w-[560px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-[22px] font-bold text-[#1a1a1a]">학생 관리</h1>
          <p className="text-[13px] text-gray-400 leading-relaxed">재원/퇴원 상태 관리 및 학생별 정보를 확인합니다.</p>
        </div>

        {/* 검색 */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="학생 이름 또는 반 이름 검색"
              className="w-full h-12 bg-white border border-gray-200 rounded-2xl pl-11 pr-4 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-[#6344d4]"
            />
          </div>

          {/* 필터 탭 */}
          <div className="flex p-1 bg-gray-100/50 rounded-xl">
            {(["active", "withdrawn"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${
                  filter === f ? "bg-white text-[#6344d4] shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {f === "active" ? "재원생" : "퇴원생"}
              </button>
            ))}
          </div>
        </div>

        {/* 목록 */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-gray-300 animate-pulse" />
              </div>
              <p className="text-gray-400 text-[14px] font-medium">불러오는 중...</p>
            </div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className={`bg-white rounded-[24px] border border-gray-100 p-5 shadow-sm space-y-4 transition-all hover:border-purple-200 ${
                  student.status === "withdrawn" ? "opacity-70" : ""
                }`}
              >
                {editingId === student.id ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="이름"
                      className="w-full h-10 border border-gray-200 rounded-xl px-3 text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-[#6344d4]"
                    />
                    <textarea
                      value={editMemo}
                      onChange={(e) => setEditMemo(e.target.value)}
                      placeholder="메모를 입력하세요"
                      className="w-full min-h-[80px] p-3 border border-gray-200 rounded-xl text-[13px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-[#6344d4] resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="flex-1 h-10 bg-[#6344d4] text-white rounded-xl text-[13px] font-bold hover:opacity-90"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex-1 h-10 rounded-xl text-[13px] font-bold border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div
                        className="flex gap-4 cursor-pointer active:opacity-60 transition-opacity flex-1"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                          <UserCircle className={`w-7 h-7 ${student.status === "active" ? "text-[#6344d4]" : "text-gray-300"}`} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[16px] font-bold text-[#1a1a1a]">{student.name}</span>
                            <Badge variant={student.status}>{student.status === "active" ? "재원중" : "퇴원"}</Badge>
                            {student.parentConnected ? (
                              <Link2 className="w-3.5 h-3.5 text-blue-500" aria-label="학부모 연결됨" />
                            ) : (
                              <Link2Off className="w-3.5 h-3.5 text-gray-300"  aria-label="연결 안됨" />
                            )}
                          </div>
                          <p className="text-[12px] text-gray-400 font-medium">{student.className}</p>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(student)}
                          className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleStatus(student.id)}
                          className={`p-2 hover:bg-gray-50 rounded-lg transition-colors ${
                            student.status === "active" ? "text-orange-400" : "text-green-400"
                          }`}
                          title={student.status === "active" ? "퇴원 처리" : "재원 복귀"}
                        >
                          {student.status === "active" ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#f8f9fc] p-3 rounded-xl border border-gray-50/50">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-300 mt-0.5" />
                        <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
                          {student.memo || "기록된 메모가 없습니다."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                        최근 출결: {student.lastAttendance}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${student.parentConnected ? "bg-blue-400" : "bg-gray-200"}`} />
                        <span className="text-[11px] text-gray-400 font-bold">
                          학부모 {student.parentConnected ? "연결됨" : "미연결"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="py-20 text-center space-y-2">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-gray-400 text-[14px] font-medium">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

        <div className="h-20" />
      </main>
    </div>
  )
}