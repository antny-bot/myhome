import React, { useState, useEffect } from "react";
import { UserCheck, ShieldAlert, CheckCircle, Save, Plus, Trash2, Mail, Loader2 } from "lucide-react";
import { useBreakpoint } from "../useBreakpoint";
import { SectionCard } from "../components/SectionCard";
import { loadSystemConfig, saveSystemConfig } from "../api";
import { copy } from "../locales/ko";

const locale = "ko";
const t = copy[locale];

export function AllowedAccountsPage({ onChanged, currentUserEmail }: { onChanged?: () => void; currentUserEmail?: string }) {
  const { isMobile } = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // 상태 변수
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
 
  // 전체 설정 로드 후 이메일 목록만 추출
  const fetchConfig = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await loadSystemConfig();
      
      const emailsStr = data.allowedEmails || "";
      const emailsArr = emailsStr
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      setAllowedEmails(emailsArr);

      const adminStr = data.adminEmails || "";
      const adminArr = adminStr
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      setAdminEmails(adminArr);
    } catch (err: any) {
      console.error("Failed to load allowed emails:", err);
      setErrorMsg(err.message || "설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // 이메일 유효성 검증
  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  };

  // 이메일 추가
  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToAdd = newEmail.trim().toLowerCase();
    
    if (!emailToAdd) return;
    
    if (!isValidEmail(emailToAdd)) {
      setErrorMsg(t.invalidEmail);
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    if (allowedEmails.includes(emailToAdd)) {
      setErrorMsg(t.alreadyExists);
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    const updatedEmails = [...allowedEmails, emailToAdd];
    await saveConfig(updatedEmails, adminEmails, t.addSuccess);
    setNewEmail("");
  };

  // 이메일 삭제
  const handleDeleteEmail = async (emailToDelete: string) => {
    if (!window.confirm(t.deleteAccountConfirm)) {
      return;
    }

    // 본인 계정 삭제 제한
    if (currentUserEmail && emailToDelete.toLowerCase() === currentUserEmail.toLowerCase()) {
      setErrorMsg(t.cantRemoveSelfAdmin || "본인 계정은 삭제할 수 없습니다.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    // 마지막 관리자 삭제 방지
    const isToDeleteAdmin = adminEmails.includes(emailToDelete);
    if (isToDeleteAdmin && adminEmails.length <= 1) {
      setErrorMsg(t.atLeastOneAdmin || "최소 한 명 이상의 관리자가 존재해야 합니다.");
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    const updatedEmails = allowedEmails.filter((email) => email !== emailToDelete);
    const updatedAdmins = adminEmails.filter((email) => email !== emailToDelete);
    await saveConfig(updatedEmails, updatedAdmins, t.deleteSuccess);
  };

  // 관리자 권한 토글
  const handleToggleAdmin = async (email: string) => {
    const isAdmin = adminEmails.includes(email);
    let updatedAdmins: string[];

    if (isAdmin) {
      // 본인의 관리자 권한 해제 제한
      if (currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase()) {
        setErrorMsg(t.cantRemoveSelfAdmin || "본인의 관리자 권한은 해제할 수 없습니다.");
        setTimeout(() => setErrorMsg(""), 3000);
        return;
      }
      // 최소 1명의 관리자 유지 검증
      if (adminEmails.length <= 1) {
        setErrorMsg(t.atLeastOneAdmin || "최소 한 명 이상의 관리자가 존재해야 합니다.");
        setTimeout(() => setErrorMsg(""), 3000);
        return;
      }
      updatedAdmins = adminEmails.filter((e) => e !== email);
    } else {
      updatedAdmins = [...adminEmails, email];
    }

    await saveConfig(allowedEmails, updatedAdmins, t.toggleAdminSuccess || "권한이 성공적으로 변경되었습니다.");
  };

  // 서버에 저장하는 공통 함수
  const saveConfig = async (emailsArr: string[], adminsArr: string[], successNotification: string) => {
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const allowedEmailsStr = emailsArr.join(",");
      const adminEmailsStr = adminsArr.join(",");
      await saveSystemConfig({
        allowedEmails: allowedEmailsStr,
        adminEmails: adminEmailsStr
      });
      setAllowedEmails(emailsArr);
      setAdminEmails(adminsArr);
      setSuccessMsg(successNotification);
      setTimeout(() => setSuccessMsg(""), 3000);
      if (onChanged) onChanged();
    } catch (err: any) {
      console.error("Failed to save allowed emails:", err);
      setErrorMsg(err.message || t.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isMobile && (
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-strong tracking-tight mt-1 flex items-center gap-2">
            <UserCheck className="text-primary h-6 w-6" />
            {t.allowedAccountsTitle}
          </h2>
          <p className="text-sm text-neutral">{t.allowedAccountsSubtitle}</p>
        </header>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 이메일 추가 폼 */}
        <div className="lg:col-span-1">
          <SectionCard
            title={t.addAccount}
            right={<Plus className="h-4 w-4 text-primary" />}
          >
            <form onSubmit={handleAddEmail} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral">Google Account Email</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 h-4 w-4 text-assistive" />
                  <input
                    type="text"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    disabled={loading || saving}
                    className="w-full bg-normal border border-normal rounded-lg pl-10 pr-3 py-2.5 text-xs text-strong placeholder-assistive focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || saving || !newEmail.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg shadow-lg shadow-primary/20 transition disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                <span>{saving ? "저장 중..." : t.addAccount}</span>
              </button>
            </form>
          </SectionCard>
        </div>

        {/* 승인된 이메일 목록 리스트 */}
        <div className="lg:col-span-2">
          <SectionCard
            title={t.allowedAccountsListTitle}
            right={<UserCheck className="h-4 w-4 text-primary" />}
          >
            {successMsg && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs px-4 py-3 rounded-lg mb-4 animate-in fade-in duration-300">
                <CheckCircle size={14} />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center gap-2 bg-warn/10 border border-warn/30 text-warn text-xs px-4 py-3 rounded-lg mb-4 animate-in fade-in duration-300">
                <ShieldAlert size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : allowedEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-normal/10 border border-dashed border-normal rounded-xl p-6">
                <ShieldAlert className="h-10 w-10 text-warn mb-3" />
                <p className="text-sm font-semibold text-strong">{t.noAllowedAccounts}</p>
                <p className="text-xs text-neutral mt-1">접근 제한을 해제하려면 최소 1개 이상의 이메일을 등록해야 합니다.</p>
              </div>
            ) : (
              <div className="border border-normal rounded-xl overflow-hidden bg-normal/10 divide-y divide-normal">
                {allowedEmails.map((email) => {
                  const isEmailAdmin = adminEmails.includes(email);
                  return (
                    <div
                      key={email}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-normal/30 transition duration-150 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-primary/10 text-primary p-2 rounded-lg flex-shrink-0">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-strong truncate break-all pr-2">
                          {email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAdmin(email)}
                          disabled={saving}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            isEmailAdmin 
                              ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
                              : "bg-normal border-normal text-neutral hover:text-strong hover:bg-normal/50"
                          }`}
                          title={isEmailAdmin ? "일반 사용자로 변경" : "관리자로 변경"}
                        >
                          {isEmailAdmin ? t.userRoleAdmin : t.userRoleNormal}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEmail(email)}
                          disabled={saving}
                          className="p-2 text-neutral hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 text-[10px] text-assistive">
              * 여기에 등록된 구글 이메일 주소만 OAuth 인증 후 대시보드 시스템에 정상적으로 로그인 및 접근할 수 있습니다.
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
