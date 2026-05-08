import * as React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const baseClass =
  "w-full rounded-card border border-rule bg-surface px-4 py-3 text-base text-ink shadow-sm outline-none transition placeholder:text-ink-muted/60 focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:opacity-50 disabled:cursor-not-allowed";

const errorClass = "border-error focus:border-error focus:ring-error-soft";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ error = false, className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={[baseClass, error ? errorClass : "", className]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  },
);
