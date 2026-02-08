import { useEffect, useMemo, useState } from "react"
import AcademyHeader from "../components/AcademyHeader"
import { supabase } from "../lib/supabase"

type Class = {
  id: string
  name: string
}

type Student = {
  id: string
  name: string
  classId: string | null
}

export default function RegistrationPage() {
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])

  // 섹터 1: 반 생성
  const [newClassName, setNewClassName] = useState("")
  const [creatingClass, setCreatingClass] = useState(false)

  // 섹터 2: 학생 생성
  const [newStudentName, setNewStudentName] = useState("")
  const [creatingStudent, setCreatingStudent] = useState(false)

  // 섹터 3: 반 배정
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [assigning, setAssigning] = useState(false)

  // 반 삭제
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null)

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

  const loadClasses = async (academyId: string) => {
    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("id, name")
      .eq("academy_id", academyId)
      .order("created_at", { ascending: true })

    if (classesError) throw classesError
    setClasses(classesData || [])
  }

  const loadStudents = async (academyId: string) => {
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, name")
      .eq("academy_id", academyId)

    if (studentsError) throw studentsError

    const studentIds = (studentsData || []).map((s: any) => s.id)
    if (studentIds.length > 0) {
      const { data: classStudentsData, error: csError } = await supabase
        .from("class_students")
        .select("student_id, class_id")
        .in("student_id", studentIds)

      if (csError) throw csError

      const classMap = new Map<string, string>()
      ;(classStudentsData || []).forEach((cs: any) => {
        classMap.set(cs.student_id, cs.class_id)
      })

      const studentsWithClass: Student[] = (studentsData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        classId: classMap.get(s.id) || null,
      }))

      setStudents(studentsWithClass)
    } else {
      setStudents([])
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const academyId = await getAcademyId()
        await loadClasses(academyId)
        await loadStudents(academyId)
      } catch (e: any) {
        console.error("데이터 로드 실패:", e)
        alert(e?.message || "데이터를 불러오는데 실패했습니다.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // 섹터 1: 반 생성
  const handleCreateClass = async () => {
    const name = newClassName.trim()
    if (!name) {
      alert("반 이름을 입력해주세요.")
      return
    }

    if (classes.some((c) => c.name === name)) {
      alert("이미 존재하는 반 이름입니다.")
      return
    }

    try {
      setCreatingClass(true)
      const academyId = await getAcademyId()

      const { data, error } = await supabase
        .from("classes")
        .insert({
          name,
          academy_id: academyId,
        })
        .select("id, name")
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error("반 생성 실패")

      setClasses((prev) => [...prev, data])
      setNewClassName("")
      alert(`${name} 반이 생성되었습니다.`)
    } catch (e: any) {
      console.error("반 생성 실패:", e)
      alert(e?.message || "반 생성에 실패했습니다.")
    } finally {
      setCreatingClass(false)
    }
  }

  // 섹터 2: 학생 생성
  const handleCreateStudent = async () => {
    const name = newStudentName.trim()
    if (!name) {
      alert("학생 이름을 입력해주세요.")
      return
    }

    if (students.some((s) => s.name === name)) {
      alert("이미 존재하는 학생 이름입니다.")
      return
    }

    try {
      setCreatingStudent(true)
      const academyId = await getAcademyId()

      const { data, error } = await supabase
        .from("students")
        .insert({
          name,
          academy_id: academyId,
        })
        .select("id, name")
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error("학생 생성 실패")

      setStudents((prev) => [...prev, { ...data, classId: null }])
      setNewStudentName("")
      alert(`${name} 학생이 생성되었습니다.`)
    } catch (e: any) {
      console.error("학생 생성 실패:", e)
      alert(e?.message || "학생 생성에 실패했습니다.")
    } finally {
      setCreatingStudent(false)
    }
  }

  // 섹터 3: 반 배정
  const handleAssignClass = async () => {
    if (!selectedClassId) {
      alert("반을 선택해주세요.")
      return
    }

    if (!selectedStudentId) {
      alert("학생을 선택해주세요.")
      return
    }

    const selectedClass = classes.find((c) => c.id === selectedClassId)
    const selectedStudent = students.find((s) => s.id === selectedStudentId)

    if (!selectedClass) {
      alert("선택된 반을 찾을 수 없습니다.")
      return
    }

    if (!selectedStudent) {
      alert("선택된 학생을 찾을 수 없습니다.")
      return
    }

    // 이미 해당 반에 배정되어 있는지 확인
    if (selectedStudent.classId === selectedClassId) {
      alert("이미 이 반에 배정된 학생입니다.")
      return
    }

    try {
      setAssigning(true)

      // 기존 배정이 있다면 삭제
      if (selectedStudent.classId) {
        const { error: deleteError } = await supabase
          .from("class_students")
          .delete()
          .eq("student_id", selectedStudentId)
          .eq("class_id", selectedStudent.classId)

        if (deleteError) throw deleteError
      }

      // 새로운 배정 추가
      const { error: insertError } = await supabase.from("class_students").insert({
        student_id: selectedStudentId,
        class_id: selectedClassId,
      })

      if (insertError) throw insertError

      // state 업데이트
      setStudents((prev) =>
        prev.map((s) => (s.id === selectedStudentId ? { ...s, classId: selectedClassId } : s))
      )

      setSelectedStudentId("")
      alert(`${selectedStudent.name} 학생이 ${selectedClass.name} 반에 배정되었습니다!`)
    } catch (e: any) {
      console.error("반 배정 실패:", e)
      alert(e?.message || "반 배정에 실패했습니다.")
    } finally {
      setAssigning(false)
    }
  }

  // 반 삭제
  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`반을 삭제할까요? 배정 학생은 반 해제됩니다.\n\n반 이름: ${className}`)) {
      return
    }

    try {
      setDeletingClassId(classId)

      // 1단계: class_students에서 해당 반의 모든 학생-반 관계 삭제
      const { error: csError } = await supabase
        .from("class_students")
        .delete()
        .eq("class_id", classId)

      if (csError) throw csError

      // 2단계: classes에서 반 삭제
      const { error: classError } = await supabase.from("classes").delete().eq("id", classId)

      if (classError) throw classError

      // 성공: state 업데이트
      setClasses((prev) => prev.filter((c) => c.id !== classId))

      // 학생 목록도 업데이트 (해당 반 학생들의 classId를 null로)
      setStudents((prev) =>
        prev.map((s) => (s.classId === classId ? { ...s, classId: null } : s))
      )

      // 선택된 반이 삭제되었다면 선택 해제
      if (selectedClassId === classId) {
        setSelectedClassId("")
      }
    } catch (e: any) {
      console.error("반 삭제 실패:", e)
      alert(e?.message || "반 삭제에 실패했습니다.")
    } finally {
      setDeletingClassId(null)
    }
  }

  const studentsByClass = useMemo(() => {
    const grouped: Record<string, Student[]> = {}
    students.forEach((s) => {
      if (s.classId) {
        if (!grouped[s.classId]) grouped[s.classId] = []
        grouped[s.classId].push(s)
      }
    })
    return grouped
  }, [students])

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <AcademyHeader />
      <main className="max-w-[520px] mx-auto px-4 py-8 space-y-6">
        {/* 헤더 */}
        <div className="space-y-1">
          <h1 className="text-[22px] font-extrabold text-[#1a1a1a]">반 / 학생 등록</h1>
          <p className="text-[13px] text-gray-400">반 생성 → 학생 생성 → 반 배정 순서로 진행하세요.</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-[28px] p-6 text-center text-gray-400 text-[14px]">
            불러오는 중...
          </div>
        ) : (
          <>
            {/* 섹터 1: 반 생성 */}
            <section className="bg-white rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-gray-100/60 space-y-4">
              <div className="space-y-1">
                <h2 className="text-[18px] font-extrabold text-[#1a1a1a]">반 생성</h2>
                <p className="text-[12px] text-gray-400">새로운 수업 반을 생성합니다.</p>
              </div>

              <div className="space-y-3">
                <input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creatingClass && newClassName.trim()) {
                      handleCreateClass()
                    }
                  }}
                  placeholder="예) 테스트반 / 1-1반"
                  className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-[14px] font-medium outline-none focus:border-[#6344d4] focus:ring-4 focus:ring-purple-100 transition"
                />

                <button
                  type="button"
                  onClick={handleCreateClass}
                  disabled={creatingClass || !newClassName.trim()}
                  className="w-full h-12 rounded-2xl bg-[#6344d4] text-white font-extrabold text-[14px] hover:bg-[#5235b5] transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creatingClass ? "생성 중..." : "반 생성"}
                </button>
              </div>
            </section>

            {/* 섹터 2: 학생 생성 */}
            <section className="bg-white rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-gray-100/60 space-y-4">
              <div className="space-y-1">
                <h2 className="text-[18px] font-extrabold text-[#1a1a1a]">학생 생성</h2>
                <p className="text-[12px] text-gray-400">새로운 학생을 등록합니다.</p>
              </div>

              <div className="space-y-3">
                <input
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creatingStudent && newStudentName.trim()) {
                      handleCreateStudent()
                    }
                  }}
                  placeholder="학생 이름 입력"
                  className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-[14px] font-medium outline-none focus:border-[#6344d4] focus:ring-4 focus:ring-purple-100 transition"
                />

                <button
                  type="button"
                  onClick={handleCreateStudent}
                  disabled={creatingStudent || !newStudentName.trim()}
                  className="w-full h-12 rounded-2xl bg-[#1a1a1a] text-white font-extrabold text-[14px] hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creatingStudent ? "생성 중..." : "학생 생성"}
                </button>
              </div>
            </section>

            {/* 섹터 3: 반 배정 */}
            <section className="bg-white rounded-[28px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-gray-100/60 space-y-4">
              <div className="space-y-1">
                <h2 className="text-[18px] font-extrabold text-[#1a1a1a]">반 배정</h2>
                <p className="text-[12px] text-gray-400">학생을 반에 배정합니다.</p>
              </div>

              <div className="space-y-3">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-[14px] font-medium outline-none focus:border-[#6344d4] focus:ring-4 focus:ring-purple-100 transition bg-white"
                >
                  <option value="">반 선택</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-[14px] font-medium outline-none focus:border-[#6344d4] focus:ring-4 focus:ring-purple-100 transition bg-white"
                >
                  <option value="">학생 선택</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.classId ? `(${classes.find((c) => c.id === s.classId)?.name || ""}반)` : "(미배정)"}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAssignClass}
                  disabled={assigning || !selectedClassId || !selectedStudentId}
                  className="w-full h-12 rounded-2xl bg-[#6344d4] text-white font-extrabold text-[14px] hover:bg-[#5235b5] transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {assigning ? "배정 중..." : "반 배정"}
                </button>
              </div>
            </section>

            {/* 현재 수업 반 */}
            <section className="bg-white rounded-[28px] p-6 border border-gray-100/60 space-y-3">
              <div className="text-[14px] font-extrabold text-[#1a1a1a]">현재 수업 반</div>

              {classes.length === 0 ? (
                <div className="text-[13px] text-gray-400">아직 생성된 반이 없습니다.</div>
              ) : (
                <div className="space-y-3">
                  {classes.map((c) => {
                    const classStudents = studentsByClass[c.id] || []
                    const isDeleting = deletingClassId === c.id
                    return (
                      <div key={c.id} className="rounded-2xl bg-[#f8f9fc] border border-gray-100 p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-extrabold text-[14px] text-[#1a1a1a]">{c.name}</div>
                          <div className="flex items-center gap-3">
                            <div className="text-[12px] text-gray-400 font-bold">{classStudents.length}명</div>
                            <button
                              type="button"
                              onClick={() => handleDeleteClass(c.id, c.name)}
                              disabled={isDeleting}
                              className="text-red-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-[12px] font-bold flex items-center gap-1"
                            >
                              {isDeleting ? (
                                "삭제 중..."
                              ) : (
                                <>
                                  <span>🗑️</span>
                                  <span>삭제</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {classStudents.length === 0 ? (
                            <span className="text-[12px] text-gray-400">배정된 학생 없음</span>
                          ) : (
                            classStudents.map((s) => (
                              <span
                                key={s.id}
                                className="px-3 py-1 rounded-full bg-white border border-gray-200 text-[12px] font-bold text-gray-700"
                              >
                                {s.name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <div className="h-10" />
      </main>
    </div>
  )
}
