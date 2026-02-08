import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import LoginPage from "./pages/LoginPage"
import ParentTokenPage from "./pages/ParentTokenPage"
import ParentAppPage from "./pages/ParentAppPage"
import ParentActionPage from "./pages/ParentActionPage"

import AcademyHomePage from "./pages/AcademyHomePage"
import AcademyAttendancePage from "./pages/AcademyAttendancePage"
import StudentManagementPage from "./pages/StudentManagementPage"
import RegistrationPage from "./pages/RegistrationPage"
import ConsultationFeedPage from "./pages/ConsultationFeedPage"

import ProtectedRoute from "./components/ProtectedRoute"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 기본 진입 */}
        <Route path="/" element={<Navigate to="/academy/login" replace />} />

        {/* 공개 라우트 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/academy/login" element={<LoginPage />} />
        <Route path="/p/:token" element={<ParentTokenPage />} />
        <Route path="/parent/app" element={<ParentAppPage />} />
        <Route path="/parent/action" element={<ParentActionPage />} />

        {/* ✅ 학원 영역: 세션 필요 (중첩 라우팅) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/academy/home" element={<AcademyHomePage />} />
          <Route path="/academy/attendance" element={<AcademyAttendancePage />} />
          <Route path="/academy/students" element={<StudentManagementPage />} />
          <Route path="/academy/registration" element={<RegistrationPage />} />
          <Route path="/academy/consultation" element={<ConsultationFeedPage />} />
        </Route>

        {/* 없는 경로는 로그인으로 */}
        <Route path="*" element={<Navigate to="/academy/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}