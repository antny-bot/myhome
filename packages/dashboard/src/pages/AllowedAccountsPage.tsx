import React, { useState, useEffect } from "react";
import { UserCheck, ShieldAlert, Plus, Trash2, Mail, Copy, Check, KeyRound } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { loadSystemConfig, saveSystemConfig, addUserAccount } from "../api";
import { copy } from "../locales/ko";
import {
  Button,
  IconButton,
  Input,
  Checkbox,
  Badge,
  ConfirmDialog,
  useToast,
  Spinner,
} from "../components/ui";
import { EmptyState } from "../components/common/EmptyState";

const locale = "ko";
const t = copy[locale];

export function AllowedAccountsPage({ onChanged, currentUserEmail }: { onChanged?: () => void; currentUserEmail?: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 상태 변수
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [isAdminChecked, setIsAdminChecked] = useState(false);
  const [tempPassInfo, setTempPassInfo] = useState<{ email: string; tempPass: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // 삭제 및 재발급 확인 모달 상태
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  // 전체 설정 로드 후 이메일 목록만 추출
  const fetchConfig = async () => {
    setLoading(true);
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
      toast.error(err.message || "설정을 불러오지 못했습니다.");
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
      toast.warning(t.invalidEmail);
      return;
    }

    if (allowedEmails.includes(emailToAdd)) {
      toast.warning(t.alreadyExists);
      return;
    }

    setSaving(true);
    setTempPassInfo(null);
    try {
      const res = await addUserAccount(emailToAdd, isAdminChecked);
      if (res.ok) {
        setAllowedEmails((prev) => [...prev, emailToAdd]);
        if (isAdminChecked) {
          setAdminEmails((prev) => [...prev, emailToAdd]);
        }
        toast.success(t.addSuccess);
        if (res.tempPassword) {
          setTempPassInfo({ email: emailToAdd, tempPass: res.tempPassword });
        }
        setNewEmail("");
        setIsAdminChecked(false);
        if (onChanged) onChanged();
      }
    } catch (err: any) {
      console.error("Failed to add user account:", err);
      toast.error(err.message || t.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  // 이메일 삭제 실행
  const confirmDeleteEmail = async () => {
    if (!deleteTarget) return;
    const emailToDelete = deleteTarget;

    // 본인 계정 삭제 제한
    if (currentUserEmail && emailToDelete.toLowerCase() === currentUserEmail.toLowerCase()) {
      toast.error(t.cantRemoveSelfAdmin || "본인 계정은 삭제할 수 없습니다.");
      setDeleteTarget(null);
      return;
    }

    // 마지막 관리자 삭제 방지
    const isToDeleteAdmin = adminEmails.includes(emailToDelete);
    if (isToDeleteAdmin && adminEmails.length <= 1) {
      toast.error(t.atLeastOneAdmin || "최소 한 명 이상의 관리자가 존재해야 합니다.");
      setDeleteTarget(null);
      return;
    }

    const updatedEmails = allowedEmails.filter((email) => email !== emailToDelete);
    const updatedAdmins = adminEmails.filter((email) => email !== emailToDelete);
    await saveConfig(updatedEmails, updatedAdmins, t.deleteSuccess);
    setDeleteTarget(null);
  };

  // 임시 비밀번호 재발급 실행
  const confirmResetPassword = async () => {
    if (!resetTarget) return;
    const email = resetTarget;

    setSaving(true);
    setTempPassInfo(null);
    try {
      const isEmailAdmin = adminEmails.includes(email);
      const res = await addUserAccount(email, isEmailAdmin);
      if (res.ok && res.tempPassword) {
        toast.success(t.resetPasswordSuccess);
        setTempPassInfo({ email, tempPass: res.tempPassword });
      }
    } catch (err: any) {
      console.error("Failed to reset password:", err);
      toast.error(err.message || t.settingsSaveFailed);
    } finally {
      setSaving(false);
      setResetTarget(null);
    }
  };

  // 관리자 권한 토글
  const handleToggleAdmin = async (email: string) => {
    const isAdmin = adminEmails.includes(email);
    let updatedAdmins: string[];

    if (isAdmin) {
      if (currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase()) {
        toast.warning(t.cantRemoveSelfAdmin || "본인의 관리자 권한은 해제할 수 없습니다.");
        return;
      }
      if (adminEmails.length <= 1) {
        toast.warning(t.atLeastOneAdmin || "최소 한 명 이상의 관리자가 존재해야 합니다.");
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
    try {
      const allowedEmailsStr = emailsArr.join(",");
      const adminEmailsStr = adminsArr.join(",");
      await saveSystemConfig({
        allowedEmails: allowedEmailsStr,
        adminEmails: adminEmailsStr,
      });
      setAllowedEmails(emailsArr);
      setAdminEmails(adminsArr);
      toast.success(successNotification);
      if (onChanged) onChanged();
    } catch (err: any) {
      console.error("Failed to save allowed emails:", err);
      toast.error(err.message || t.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.allowedAccountsTitle}
        subtitle={t.allowedAccountsSubtitle}
        icon={UserCheck}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 이메일 추가 폼 */}
        <div className="lg:col-span-1">
          <SectionCard
            title={t.addAccount}
            right={<Plus className="h-4 w-4 text-primary" />}
          >
            <form onSubmit={handleAddEmail} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-strong">Account Email</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  disabled={loading || saving}
                  leftIcon={Mail}
                  inputSize="md"
                />
              </div>

              <Checkbox
                id="isAdmin"
                checked={isAdminChecked}
                onChange={(e) => setIsAdminChecked(e.target.checked)}
                disabled={loading || saving}
                label={t.isAdminUser}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={saving}
                disabled={loading || !newEmail.trim()}
                leftIcon={Plus}
              >
                {t.addAccount}
              </Button>
            </form>

            {tempPassInfo && (
              <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary-light/10 space-y-2 animate-fade-in-up">
                <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <ShieldAlert size={14} />
                  <span>{t.tempPasswordIssued}</span>
                </div>
                <p className="text-xs text-neutral leading-relaxed">
                  {t.tempPasswordAlert}
                </p>
                <div className="flex items-center gap-2 bg-elevated border border-normal p-2 rounded-lg mt-1">
                  <code className="text-xs font-mono font-bold text-strong select-all flex-grow break-all px-1">
                    {tempPassInfo.tempPass}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassInfo.tempPass);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    leftIcon={copied ? Check : Copy}
                    className="text-xs"
                  >
                    {copied ? t.copySuccess : t.copyTempPassword}
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* 승인된 이메일 목록 리스트 */}
        <div className="lg:col-span-2">
          <SectionCard
            title={t.allowedAccountsListTitle}
            right={<UserCheck className="h-4 w-4 text-primary" />}
          >
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" color="primary" />
              </div>
            ) : allowedEmails.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title={t.noAllowedAccounts}
                description="접근 제한을 해제하려면 최소 1개 이상의 이메일을 등록해야 합니다."
              />
            ) : (
              <div className="border border-normal rounded-xl overflow-hidden bg-elevated divide-y divide-normal">
                {allowedEmails.map((email) => {
                  const isEmailAdmin = adminEmails.includes(email);
                  return (
                    <div
                      key={email}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-alternative/40 transition duration-150"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-primary-light text-primary p-2 rounded-lg shrink-0">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-strong truncate break-all pr-2">
                          {email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAdmin(email)}
                          disabled={saving}
                          className="cursor-pointer"
                          title={isEmailAdmin ? "일반 사용자로 변경" : "관리자로 변경"}
                        >
                          <Badge
                            tone={isEmailAdmin ? "primary" : "neutral"}
                            variant="subtle"
                            size="md"
                          >
                            {isEmailAdmin ? t.userRoleAdmin : t.userRoleNormal}
                          </Badge>
                        </button>
                        <IconButton
                          aria-label={t.resetPasswordTooltip}
                          icon={KeyRound}
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetTarget(email)}
                          disabled={saving}
                          className="text-neutral hover:text-warning"
                        />
                        <IconButton
                          aria-label="삭제"
                          icon={Trash2}
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(email)}
                          disabled={saving}
                          className="text-neutral hover:text-warn"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 text-xs text-assistive">
              * 여기에 등록된 계정 이메일 주소로 구글 OAuth 인증 또는 발급된 임시 비밀번호를 통해 대시보드 시스템에 로그인할 수 있습니다.
            </div>
          </SectionCard>
        </div>
      </div>

      {/* 계정 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteEmail}
        title="계정 삭제 확인"
        message={t.deleteAccountConfirm}
        confirmText="삭제"
        cancelText="취소"
        tone="danger"
        loading={saving}
      />

      {/* 임시 비밀번호 재발급 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        onConfirm={confirmResetPassword}
        title="임시 비밀번호 재발급"
        message={t.resetPasswordConfirm.replace("{email}", resetTarget || "")}
        confirmText="재발급"
        cancelText="취소"
        tone="primary"
        loading={saving}
      />
    </div>
  );
}
