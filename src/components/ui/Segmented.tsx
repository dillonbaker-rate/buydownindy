"use client";
import type { ReactNode } from "react";
import { useId } from "react";

export interface SegOption<T> {
  value: T;
  label: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  name,
  className = "",
  optClassName = "",
  label,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  name?: string;
  className?: string;
  optClassName?: string;
  label?: string;
}) {
  const auto = useId();
  const n = name ?? auto;
  return (
    <div className={`seg ${className}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={String(o.value)} className={`seg-opt ${optClassName}`} aria-label={o.ariaLabel}>
          <input
            type="radio"
            name={n}
            checked={o.value === value}
            disabled={o.disabled}
            onChange={() => !o.disabled && onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
