"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
};

type ConfirmDialogProps = {
  open: boolean;
  options: ConfirmOptions | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  options,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open || !options) return null;

  const variant = options.variant ?? "danger";
  const isDanger = variant === "danger";
  const iconClass =
    variant === "danger"
      ? "bg-red-50 text-red-600"
      : variant === "warning"
        ? "bg-amber-50 text-amber-600"
        : "bg-blue-50 text-blue-600";
  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-200"
      : variant === "warning"
        ? "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-200"
        : "bg-slate-900 hover:bg-slate-800 focus-visible:ring-slate-200";

  return (
    <div
      className="ui-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[3px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="ui-modal w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        dir="rtl"
      >
        <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-base font-extrabold text-slate-900">
              {options.title}
            </h2>
            <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-500">
              {options.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="إغلاق"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-start sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          >
            {options.cancelText ?? "إلغاء"}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 active:translate-y-0 active:scale-[0.98] ${confirmClass}`}
          >
            {isDanger ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {options.confirmText ?? "تأكيد"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions | null;
    action: (() => void) | null;
  }>({ open: false, options: null, action: null });

  const confirm = useCallback((options: ConfirmOptions, action: () => void) => {
    setState({ open: true, options, action });
  }, []);

  const cancel = useCallback(() => {
    setState({ open: false, options: null, action: null });
  }, []);

  const accept = useCallback(() => {
    const action = state.action;
    setState({ open: false, options: null, action: null });
    action?.();
  }, [state.action]);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      options={state.options}
      onCancel={cancel}
      onConfirm={accept}
    />
  );

  return { confirm, dialog };
}
