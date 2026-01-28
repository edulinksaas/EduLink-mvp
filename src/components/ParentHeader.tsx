export default function ParentHeader({ studentName, onResetToken }:{ studentName?:string; onResetToken:()=>void }) {
  return (
    <header className="p-headerbar">
      <div className="p-header-left">
        <div className="p-header-title">학부모 전용 · {studentName || "학생"} 리포트</div>
      </div>
      <div className="p-header-right">
        <button className="hbtn" onClick={onResetToken}>토큰 변경</button>
      </div>
    </header>
  )
}
