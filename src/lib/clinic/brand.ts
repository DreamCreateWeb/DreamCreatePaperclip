import type * as React from "react";
import type { ClinicBrand } from "@/src/db/schema";

const FALLBACK_PRIMARY = "#0a3d2e";
const FALLBACK_ACCENT = "#d8ebe2";

export type ResolvedBrand = {
  primary: string;
  primaryFg: string;
  accent: string;
  accentFg: string;
  primarySoft: string;
};

function clampHex(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const v = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const v = hex.replace("#", "");
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function readableForeground(hex: string): string {
  return relativeLuminance(hex) > 0.55 ? "#0b0b0c" : "#ffffff";
}

function softTint(hex: string, mix = 0.88): string {
  const { r, g, b } = parseHex(hex);
  const lerp = (c: number) => Math.round(c + (255 - c) * mix);
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(lerp(r))}${toHex(lerp(g))}${toHex(lerp(b))}`;
}

export function resolveBrand(brand: ClinicBrand | null | undefined): ResolvedBrand {
  const primary = clampHex(brand?.primaryColor, FALLBACK_PRIMARY);
  const accent = clampHex(brand?.accentColor, FALLBACK_ACCENT);
  return {
    primary,
    primaryFg: readableForeground(primary),
    accent,
    accentFg: readableForeground(accent),
    primarySoft: softTint(primary),
  };
}

export function brandStyle(brand: ResolvedBrand): React.CSSProperties {
  return {
    "--clinic-primary": brand.primary,
    "--clinic-primary-fg": brand.primaryFg,
    "--clinic-primary-soft": brand.primarySoft,
    "--clinic-accent": brand.accent,
    "--clinic-accent-fg": brand.accentFg,
  } as React.CSSProperties;
}
