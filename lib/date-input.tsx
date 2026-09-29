"use client";

import { useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";

function toDisplayValue(value?: string): string {
  if (!value) return "";

  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}/${String(Number(month)).padStart(2, "0")}/${String(Number(day)).padStart(2, "0")}`;
  }

  return value;
}

function toIsoDate(value: string): string | null {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return null;

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));

  if (year < 1000 || month < 1 || month > 12 || day < 1) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
}

type DateInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value?: string;
  onChange: (value: string) => void;
};

export default function DateInput({
  value = "",
  onChange,
  placeholder = "YYYY/MM/DD",
  className = "",
  onBlur,
  ...props
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState(() => toDisplayValue(value));
  const nativeDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayValue(toDisplayValue(value));
  }, [value]);

  const commitIsoValue = (isoValue: string) => {
    setDisplayValue(toDisplayValue(isoValue));
    onChange(isoValue);
  };

  const openCalendar = () => {
    const input = nativeDateRef.current;
    if (!input) return;

    try {
      const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
      pickerInput.showPicker?.();
    } catch {
      input.focus();
      input.click();
    }
  };

  return (
    <div className="relative w-full">
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={displayValue}
        onChange={(event) => {
          const nextDisplayValue = maskDateInput(event.target.value);
          setDisplayValue(nextDisplayValue);

          if (!nextDisplayValue) {
            onChange("");
            return;
          }

          const isoValue = toIsoDate(nextDisplayValue);
          if (isoValue) onChange(isoValue);
        }}
        onBlur={(event) => {
          if (displayValue && !toIsoDate(displayValue)) {
            setDisplayValue(toDisplayValue(value));
          }
          onBlur?.(event);
        }}
        className={className}
        dir="ltr"
        style={{ textAlign: "right", paddingRight: "3rem", ...props.style }}
      />

      <button
        type="button"
        onClick={openCalendar}
        className="absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 hover:text-blue-600 focus-visible:bg-slate-100"
        aria-label="اختيار التاريخ من التقويم"
        title="اختيار التاريخ من التقويم"
      >
        <CalendarDays className="h-5 w-5" />
      </button>

      <input
        ref={nativeDateRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value?.match(/^\d{4}-\d{2}-\d{2}$/) ? value : ""}
        min={typeof props.min === "string" ? props.min : undefined}
        max={typeof props.max === "string" ? props.max : undefined}
        onChange={(event) => {
          if (event.target.value) commitIsoValue(event.target.value);
        }}
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
    </div>
  );
}
