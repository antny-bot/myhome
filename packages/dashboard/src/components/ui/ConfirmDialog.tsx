import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  tone = "primary",
  loading = false,
}: ConfirmDialogProps) {
  const Icon = tone === "danger" ? AlertTriangle : Info;

  const footer = (
    <>
      <Button variant="secondary" size="md" onClick={onClose} disabled={loading}>
        {cancelText}
      </Button>
      <Button
        variant={tone === "danger" ? "danger" : "primary"}
        size="md"
        loading={loading}
        onClick={onConfirm}
      >
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEsc={!loading}
      showCloseButton={!loading}
      footer={footer}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`shrink-0 p-2.5 rounded-full ${
            tone === "danger"
              ? "bg-warn-light text-warn"
              : "bg-primary-light text-primary"
          }`}
        >
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-strong mb-1">{title}</h3>
          <div className="text-xs sm:text-sm text-neutral leading-relaxed">{message}</div>
        </div>
      </div>
    </Modal>
  );
}
