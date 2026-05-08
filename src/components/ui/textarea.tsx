import * as React from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const baseClass =
  "w-full rounded-card border border-rule bg-surface px-4 py-3 text-base text-ink shadow-sm outline-none transition placeholder:text-ink-muted/60 focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[100px]";

const errorClass = "border-error focus:border-error focus:ring-error-soft";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(function Textarea({ error = false, className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={[baseClass, error ? errorClass : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-invalid={error || undefined}
      {...props}
    />
  );
});
