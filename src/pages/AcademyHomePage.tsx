// src/pages/AcademyHomePage.tsx
import React from "react"
import { useNavigate } from "react-router-dom"
import AcademyHeader from "../components/AcademyHeader"
import { supabase } from "../lib/supabase"

// 아이콘: lucide-react
import { Users, Settings, Clock, MessageCircle, ChevronRight } from "lucide-react"

type View = "attendance" | "registration" | "consultation" | "students"

export default function AcademyHomePage() {
  const nav = useNavigate()
  const [academyName, setAcademyName] = React.useState<string>("")

  React.useEffect(() => {
    const loadAcademyName = async () => {
      try {
        // 1. 로그인 세션 확인
        const { data: sessionData } = await supabase.auth.getSession()
        console.log("SESSION:", sessionData)

        if (!sessionData.session) {
          console.error("❌ 세션 없음")
          return
        }

        const userId = sessionData.session.user.id
        console.log("USER ID:", userId)

        // 2. academy_users에서 academy_id 조회
        const { data: academyUsers, error: auErr } = await supabase
          .from("academy_users")
          .select("academy_id")
          .eq("user_id", userId)

        console.log("ACADEMY USERS:", academyUsers, auErr)

        if (auErr) throw auErr

        const academyId = academyUsers?.[0]?.academy_id

        if (!academyId) {
          console.error("❌ academy_id 없음")
          return
        }

        // 3. academies에서 학원명 조회
        const { data: academy, error: academyErr } = await supabase
          .from("academies")
          .select("name")
          .eq("id", academyId)
          .maybeSingle()

        if (academyErr) throw academyErr

        if (academy?.name) {
          setAcademyName(academy.name)
        }

        // 4. students 조회 (디버그용)
        const { data: students, error: stErr } = await supabase
          .from("students")
          .select("*")
          .eq("academy_id", academyId)

        console.log("STUDENTS:", students, stErr)
      } catch (e: any) {
        console.error("학원명 로드 실패:", e)
      }
    }

    loadAcademyName()
  }, [])

  // ✅ 메뉴 이동 (너 라우트에 맞게 map만 수정하면 됨)
  const onNavigate = (view: View) => {
    const map: Record<View, string> = {
      attendance: "/academy/attendance",
      students: "/academy/students",
      registration: "/academy/registration",
      consultation: "/academy/consultation",
    }
    nav(map[view])
  }

  const quickMenus: Array<{
    key: View
    title: string
    desc: string
    icon: React.ComponentType<{ className?: string }>
    primary?: boolean
  }> = [
    {
      key: "attendance",
      title: "출결 체크하기",
      desc: "오늘 수업의 출결과 피드백을 기록합니다.",
      icon: Clock,
      primary: true,
    },
    {
      key: "students",
      title: "학생 통합 관리",
      desc: "재원/퇴원 상태 및 학생 메모를 관리합니다.",
      icon: Users,
    },
    {
      key: "registration",
      title: "수업 / 학생 등록",
      desc: "새로운 반을 만들거나 학생 정보를 추가합니다.",
      icon: Settings,
    },
    {
      key: "consultation",
      title: "학부모 상담 피드",
      desc: "최근 전송된 피드백과 학부모 반응을 확인합니다.",
      icon: MessageCircle,
    },
  ]

  return (
    <div className="academyShell">
      <AcademyHeader />

      <main className="academyMain">
        {/* ✅ 인사말 */}
        <section className="academyGreeting">
          <h1 className="academyH1">
            안녕하세요, <br />
            <span className="academyAccent">{academyName}</span>님!
          </h1>
          <p className="academySub">오늘도 즐거운 수업 되세요. 😊</p>
        </section>

        {/* ✅ 퀵 메뉴 */}
        <section className="academySection">
          <h2 className="academyH2">운영 관리</h2>

          <div className="academyMenuList">
            {quickMenus.map((m) => {
              const Icon = m.icon
              return (
                <button
                  key={m.key}
                  type="button" // ✅ submit 방지 (튕김/로그아웃처럼 보이는 원인)
                  className={`academyMenuItem ${m.primary ? "isPrimary" : ""}`}
                  onClick={() => onNavigate(m.key)}
                >
                  <div
                    className={`academyMenuIconWrap ${m.primary ? "isPrimary" : ""}`}
                    aria-hidden="true"
                  >
                    <Icon className={`academyMenuIcon ${m.primary ? "isPrimary" : ""}`} />
                  </div>

                  <div className="academyMenuText">
                    <div className={`academyMenuTitle ${m.primary ? "isPrimary" : ""}`}>
                      {m.title}
                    </div>
                    <div className={`academyMenuDesc ${m.primary ? "isPrimary" : ""}`}>
                      {m.desc}
                    </div>
                  </div>

                  <ChevronRight className={`academyMenuChevron ${m.primary ? "isPrimary" : ""}`} />
                </button>
              )
            })}
          </div>
        </section>

        <footer className="academyFooter">EduLink Academy Management v1.0</footer>
      </main>
    </div>
  )
}