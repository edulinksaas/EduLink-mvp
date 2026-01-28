// src/pages/ParentTokenPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function extractToken(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    const parts = url.pathname.split("/").filter(Boolean);
    const pIndex = parts.indexOf("p");
    if (pIndex !== -1 && parts[pIndex + 1]) return parts[pIndex + 1];
  } catch {}
  const m = v.match(/\/p\/([^/?#]+)/);
  if (m?.[1]) return m[1];
  return v;
}

export default function ParentTokenPage() {
  const nav = useNavigate();
  const [invite, setInvite] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onGo = () => {
    setError(null);
    const token = extractToken(invite);
    if (!token) return setError("초대 링크(또는 토큰)를 입력해주세요.");
    if (remember) localStorage.setItem("edulink_parent_token", token);
    nav(`/p/${token}`, { replace: true });
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <h2 className="authH1">학부모 전용</h2>
        <p className="authDesc">학원에서 받은 초대 링크로 출결/피드백을 확인합니다.</p>

        <form className="authForm" onSubmit={(e) => { e.preventDefault(); onGo(); }}>
          <div className="authField">
            <span className="authLabel">초대 링크 / 토큰</span>
            <input
              className="authInput"
              placeholder="초대 링크를 붙여넣거나 토큰만 입력"
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
            />
          </div>

          <label className="authCheck">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            이 기기에서 다음부터 자동으로 보기
          </label>

          {error && <div className="authError">{error}</div>}

          <button type="submit" className="authPrimary" disabled={!invite.trim()}>확인</button>

          <div className="authHint">예) https://도메인/p/토큰 링크를 그대로 붙여넣어도 돼요.</div>
        </form>
      </div>
    </div>
  );
}