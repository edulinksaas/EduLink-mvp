// src/components/AcademyHeader.tsx
import React from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

type Props = {
  title?: string
}

export default function AcademyHeader({ title }: Props) {
  const nav = useNavigate()

  const goHome = () => {
    nav("/academy/home")
  }

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      nav("/academy/login", { replace: true })
    } catch (err) {
      console.error("Logout failed:", err)
      window.location.replace("/academy/login")
    }
  }

  const navItems = [
    { to: "/academy/attendance", label: "출결 체크하기" },
    { to: "/academy/students", label: "학생 통합 관리" },
    { to: "/academy/registration", label: "수업/학생 등록" },
    { to: "/academy/consultation", label: "학부모 상담 피드" },
  ] as const

  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-[980px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {/* 왼쪽: 로고 + (옵션) 타이틀 */}
        <div className="flex items-center gap-4 min-w-[180px]">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 text-left active:scale-[0.99] transition"
            aria-label="Edu-Link 홈으로 이동"
          >
            {/* ✅ w-21 같은 건 Tailwind 기본에 없음 -> w-[84px] 같이 쓰는 게 안전 */}
            <img src="/logo.png" alt="Edu-Link" className="h-7 w-auto" />
          </button>

          {title ? (
            <div className="hidden md:block">
              <div className="text-[12px] text-gray-400 font-semibold leading-tight">
                {title}
              </div>
            </div>
          ) : null}
        </div>

        {/* 가운데: 메뉴 */}
        <nav className="flex-1 overflow-x-auto">
          <div className="flex items-center gap-2 justify-center min-w-max">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "px-3 h-9 rounded-full flex items-center",
                    "text-[13px] font-extrabold transition whitespace-nowrap",
                    isActive
                      ? "bg-[#6344d4] text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* 오른쪽: 로그아웃 */}
        <div className="min-w-[110px] flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 h-10 rounded-full bg-[#6344d4] text-white font-bold text-[13px] hover:bg-[#5235b5] active:scale-95 transition"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  )
}