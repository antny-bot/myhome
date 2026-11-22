import React, { useState, useEffect } from "react";
import { Sliders, CheckCircle, ShieldAlert, Save } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { updateCredentials } from "../api";

interface SettingsAccountSectionProps {
  userEmail?: string;
  onChanged?: () => void;
}

export function SettingsAccountSection({ userEmail, onChanged }: SettingsAccountSectionProps) {
  const [localEmail, setLocalEmail] = useState(userEmail || "");
  const [localPassword, setLocalPassword] = useState("");
  const [localPasswordConfirm, setLocalPasswordConfirm] = useState("");
  const [localSaving, setLocalSaving] = useState(false);
  const [localSuccessMsg, setLocalSuccessMsg] = useState("");
  const [localErrorMsg, setLocalErrorMsg] = useState("");

  useEffect(() => {
    if (userEmail) {
      setLocalEmail(userEmail);
    }
  }, [userEmail]);

  const handleAccountSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localEmail.trim()) {
      setLocalErrorMsg("이메일은 필수 입력 항목입니다.");
      return;
    }
    if (localPassword && localPassword !== localPasswordConfirm) {
      setLocalErrorMsg("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setLocalSaving(true);
    setLocalSuccessMsg("");
    setLocalErrorMsg("");
    try {
      const res = await updateCredentials(localEmail.trim(), localPassword || undefined);
      if (res.ok) {
        setLocalSuccessMsg(
          "계정 설정이 저장되었습니다. 이메일이 변경된 경우 새로운 이메일로 다시 로그인 세션이 유지됩니다."
        );
        setLocalPassword("");
        setLocalPasswordConfirm("");
        setTimeout(() => setLocalSuccessMsg(""), 4000);
        if (onChanged) onChanged();
      }
    } catch (err: any) {
      setLocalErrorMsg(err.message || "계정 설정 저장 실패");
    } finally {
      setLocalSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <SectionCard title="로컬 로그인 계정 설정" right={<Sliders size={15} className="text-primary" />}>
        <form onSubmit={handleAccountSave} className="space-y-5 max-w-md">
          {localSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-500 flex items-center gap-2">
              <CheckCircle size={15} />
              <span>{localSuccessMsg}</span>
            </div>
          )}
          {localErrorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-500 flex items-center gap-2">
              <ShieldAlert size={15} />
              <span>{localErrorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral">로그인 이메일 주소</label>
            <input
              type="email"
              required
              value={localEmail}
              onChange={(e) => setLocalEmail(e.target.value)}
              className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-xs font-semibold text-strong focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              placeholder="user@example.com"
            />
            <p className="text-[10px] text-neutral leading-relaxed">
              로컬 로그인(비밀번호 로그인)에 사용할 이메일입니다. 이메일을 변경하면 작성한 알림 규칙 및 프리셋 소유자도
              함께 이전됩니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral">새 비밀번호</label>
            <input
              type="password"
              value={localPassword}
              onChange={(e) => setLocalPassword(e.target.value)}
              className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-xs font-semibold text-strong focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              placeholder="변경할 새 비밀번호 입력 (공백 시 미변경)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-neutral">새 비밀번호 확인</label>
            <input
              type="password"
              value={localPasswordConfirm}
              onChange={(e) => setLocalPasswordConfirm(e.target.value)}
              className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-xs font-semibold text-strong focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              placeholder="새 비밀번호 다시 입력"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={localSaving}
              className="flex items-center justify-center gap-1.5 px-4 h-9 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all disabled:opacity-50"
            >
              {localSaving ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-b-white" />
              ) : (
                <Save size={13} />
              )}
              <span>계정 설정 저장</span>
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
