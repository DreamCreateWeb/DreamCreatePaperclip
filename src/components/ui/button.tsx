import * as React from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
  outline:
    "border border-brand text-brand bg-transparent hover:bg-brand-soft focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
  ghost:
    "text-brand bg-transparent hover:bg-brand-soft focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
  danger:
    "bg-error text-white shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-xs font-medium uppercase tracking-[0.12em]",
  md: "px-5 py-3 text-sm font-medium",
  lg: "px-7 py-4 text-base font-medium",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center rounded-pill transition outline-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  },
);
