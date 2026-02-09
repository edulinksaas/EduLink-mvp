// src/components/AcademyHeader.tsx
import React from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

type Props = {
  title?: string
}

export default function AcademyHeader({ title }: Props) {
  const nav = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // 라우트 바뀌면 모바일 메뉴 자동 닫기
  React.useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // ESC로 닫기
  React.useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mobileOpen])

  const goHome = () => {
    nav("/academy/home")
  }

  const handleLogout = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "px-3 h-9 rounded-full flex items-center",
      "text-[13px] font-extrabold transition whitespace-nowrap",
      isActive ? "bg-[#6344d4] text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100",
    ].join(" ")

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "w-full flex items-center justify-between",
      "px-4 py-3 rounded-2xl border",
      "text-[14px] font-extrabold transition",
      isActive
        ? "bg-[#6344d4] text-white border-[#6344d4]"
        : "bg-white text-gray-800 border-gray-100 hover:bg-gray-50",
    ].join(" ")

  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* 왼쪽: 로고 + (옵션) 타이틀 */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2 text-left active:scale-[0.99] transition min-w-0"
            aria-label="Edu-Link 홈으로 이동"
          >
            <img src="/logo.png" alt="Edu-Link" className="h-7 w-auto shrink-0" />
            {title ? (
              <div className="hidden lg:block min-w-0">
                <div className="text-[12px] text-gray-400 font-semibold leading-tight truncate">
                  {title}
                </div>
              </div>
            ) : null}
          </button>
        </div>

        {/* 데스크탑: 메뉴 */}
        <nav className="hidden md:flex flex-1 justify-center overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* 오른쪽: 데스크탑 로그아웃 / 모바일 햄버거 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 데스크탑 로그아웃 */}
          <button
            type="button"
            onClick={(e) => handleLogout(e)}
            className="hidden md:inline-flex items-center justify-center px-4 h-10 rounded-full bg-[#6344d4] text-white font-bold text-[13px] leading-none hover:bg-[#5235b5] active:scale-95 transition"
          >
            로그아웃
          </button>

          {/* 모바일: 로그아웃 아이콘 버튼 */}
          <button
            type="button"
            onClick={(e) => handleLogout(e)}
            className="md:hidden h-10 w-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center active:scale-95 transition"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <span className="text-[16px]">🚪</span>
          </button>

          {/* 모바일: 햄버거 */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden h-10 w-10 rounded-full bg-[#6344d4] text-white flex items-center justify-center active:scale-95 transition"
            aria-label="메뉴 열기"
          >
            <span className="text-[18px] leading-none">≡</span>
          </button>
        </div>
      </div>

      {/* ✅ 모바일 오버레이 + 우측 슬라이드 패널 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          {/* overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="메뉴 닫기"
            onClick={() => setMobileOpen(false)}
          />

          {/* panel */}
          <div className="absolute top-0 right-0 h-full w-[86%] max-w-[340px] bg-white shadow-2xl border-l border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-[#6344d4] font-black">
                  E
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] text-gray-400 font-bold">학원 전용</div>
                  <div className="text-[14px] font-extrabold text-gray-900 truncate">
                    메뉴
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="h-10 w-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center active:scale-95 transition"
                aria-label="닫기"
              >
                <span className="text-[18px] leading-none">×</span>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* 타이틀(옵션) */}
              {title ? (
                <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
                  <div className="text-[12px] text-gray-400 font-bold">현재</div>
                  <div className="text-[14px] font-extrabold text-gray-900 mt-0.5">{title}</div>
                </div>
              ) : null}

              {/* 메뉴들 */}
              <div className="space-y-2">
                {navItems.map((item) => (
                  <NavLink key={item.to} to={item.to} className={mobileLinkClass}>
                    <span>{item.label}</span>
                    <span className="text-[16px] opacity-60">›</span>
                  </NavLink>
                ))}
              </div>

              {/* 로그아웃 */}
              <button
                type="button"
                onClick={(e) => handleLogout(e)}
                className="w-full mt-2 h-11 rounded-2xl bg-[#6344d4] text-white font-extrabold text-[14px] hover:bg-[#5235b5] active:scale-[0.99] transition"
              >
                로그아웃
              </button>

              <div className="pt-2 text-[12px] text-gray-400 font-semibold">
                ESC 또는 바깥 영역 클릭으로 닫기
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}