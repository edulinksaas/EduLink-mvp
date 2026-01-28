import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function AcademyHeader({ title }: { title: string }) {
  const nav = useNavigate()
  const logout = async () => { await supabase.auth.signOut(); nav("/academy/login",{replace:true}) }
  return (
    <header className="app-header">
      <div className="app-header-left">
        <div className="app-brand">EduLink</div>
        <div className="app-header-title">{title}</div>
      </div>
      <div className="app-header-right">
        <button className="hbtn" onClick={() => nav("/academy/settings")}>수업/학생 등록</button>
        <button className="hbtn hbtn-primary" onClick={logout}>로그아웃</button>
      </div>
    </header>
  )
}
