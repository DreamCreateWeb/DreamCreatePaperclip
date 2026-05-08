import * as React from "react";
import type { ClinicBrand } from "@/src/db/schema";
import { resolveBrand } from "@/src/lib/clinic/brand";

interface ClinicProviderProps {
  brand?: ClinicBrand | null;
  children: React.ReactNode;
  className?: string;
}

export function ClinicProvider({
  brand,
  children,
  className,
}: ClinicProviderProps) {
  const resolved = resolveBrand(brand);

  // Bridge both CSS variable systems:
  // - --color-brand / --color-brand-soft / --color-brand-fg for Tailwind utilities
  // - --clinic-primary / --clinic-primary-fg / etc. for inline styles
  const vars = {
    "--color-brand": resolved.primary,
    "--color-brand-soft": resolved.primarySoft,
    "--color-brand-fg": resolved.primaryFg,
    "--clinic-primary": resolved.primary,
    "--clinic-primary-fg": resolved.primaryFg,
    "--clinic-primary-soft": resolved.primarySoft,
    "--clinic-accent": resolved.accent,
    "--clinic-accent-fg": resolved.accentFg,
  } as React.CSSProperties;

  return (
    <div style={vars} className={className}>
      {children}
    </div>
  );
}
