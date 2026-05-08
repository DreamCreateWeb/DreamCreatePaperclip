import * as React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
}

const baseClass =
  "w-full appearance-none rounded-card border border-rule bg-surface px-4 py-3 pr-10 text-base text-ink shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:opacity-50 disabled:cursor-not-allowed";

const errorClass = "border-error focus:border-error focus:ring-error-soft";

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { options, placeholder, error = false, className = "", ...props },
    ref,
  ) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={[baseClass, error ? errorClass : "", className]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={error || undefined}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Chevron */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    );
  },
);
