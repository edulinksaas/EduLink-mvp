// src/layouts/AcademyLayout.tsx
import { Outlet } from "react-router-dom"
import AcademyHeader from "../components/AcademyHeader"

export default function AcademyLayout() {
  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <AcademyHeader />
      <div className="max-w-[980px] mx-auto px-6 py-6">
        <Outlet />
      </div>
    </div>
  )
}