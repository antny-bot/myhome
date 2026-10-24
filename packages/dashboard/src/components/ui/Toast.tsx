import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { classNames } from "../../lib/format";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, options?: { type?: ToastType; title?: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const iconMap: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastStyleMap: Record<ToastType, { iconColor: string; borderColor: string; bgTone: string }> = {
  success: {
    iconColor: "text-signal",
    borderColor: "border-signal/30",
    bgTone: "bg-signal-light/10",
  },
  error: {
    iconColor: "text-warn",
    borderColor: "border-warn/30",
    bgTone: "bg-warn-light/10",
  },
  info: {
    iconColor: "text-primary",
    borderColor: "border-primary/30",
    bgTone: "bg-primary-light/10",
  },
  warning: {
    iconColor: "text-warning",
    borderColor: "border-warning/30",
    bgTone: "bg-warning-light/10",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options?: { type?: ToastType; title?: string; duration?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const type = options?.type || "info";
      const duration = options?.duration ?? 3500;

      const newToast: ToastItem = {
        id,
        type,
        title: options?.title,
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const success = useCallback((message: string, title?: string) => show(message, { type: "success", title }), [show]);
  const error = useCallback((message: string, title?: string) => show(message, { type: "error", title }), [show]);
  const info = useCallback((message: string, title?: string) => show(message, { type: "info", title }), [show]);
  const warning = useCallback((message: string, title?: string) => show(message, { type: "warning", title }), [show]);

  const value = useMemo(
    () => ({ show, success, error, info, warning, dismiss }),
    [show, success, error, info, warning, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          const style = toastStyleMap[toast.type];

          return (
            <div
              key={toast.id}
              role="status"
              className={classNames(
                "pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border bg-elevated shadow-lg transition-all duration-200 animate-fade-in-up",
                style.borderColor,
                style.bgTone
              )}
            >
              <Icon size={18} className={classNames("shrink-0 mt-0.5", style.iconColor)} />
              <div className="flex-1 min-w-0">
                {toast.title && <h4 className="text-xs font-bold text-strong mb-0.5">{toast.title}</h4>}
                <p className="text-xs text-neutral leading-relaxed break-words">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-assistive hover:text-strong p-1 rounded-md transition-colors"
                aria-label="닫기"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
