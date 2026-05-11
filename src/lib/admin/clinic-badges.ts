import type { Clinic } from "@/src/db/schema";

export type StripeBadgeStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "provisioning"
  | "no_subscription";

export type VercelBadgeStatus =
  | "deployed"
  | "deploying"
  | "not_provisioned"
  | "failed";

export type SentryBadgeStatus = "not_configured";

export type ClinicBadges = {
  stripe: StripeBadgeStatus;
  vercel: VercelBadgeStatus;
  sentry: SentryBadgeStatus;
};

export function getClinicBadges(clinic: Clinic): ClinicBadges {
  return {
    stripe: deriveStripeBadge(clinic),
    vercel: deriveVercelBadge(clinic),
    sentry: "not_configured",
  };
}

function deriveStripeBadge(clinic: Clinic): StripeBadgeStatus {
  switch (clinic.status) {
    case "live":
      return "active";
    case "past_due":
      return "past_due";
    case "cancelled":
      return "cancelled";
    case "provisioning":
      return "provisioning";
    default:
      return "no_subscription";
  }
}

function deriveVercelBadge(clinic: Clinic): VercelBadgeStatus {
  if (!clinic.vercelProjectId) return "not_provisioned";
  if (clinic.vercelDeploymentUrl) return "deployed";
  if (clinic.status === "provisioning") return "deploying";
  return "deploying";
}

export const STRIPE_BADGE_CONFIG: Record<
  StripeBadgeStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-800",
  },
  past_due: {
    label: "Past due",
    className: "bg-amber-100 text-amber-800",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800",
  },
  provisioning: {
    label: "Provisioning",
    className: "bg-blue-100 text-blue-800",
  },
  no_subscription: {
    label: "No subscription",
    className: "bg-zinc-100 text-zinc-600",
  },
};

export const VERCEL_BADGE_CONFIG: Record<
  VercelBadgeStatus,
  { label: string; className: string }
> = {
  deployed: {
    label: "Deployed",
    className: "bg-emerald-100 text-emerald-800",
  },
  deploying: {
    label: "Deploying…",
    className: "bg-blue-100 text-blue-800",
  },
  not_provisioned: {
    label: "Not provisioned",
    className: "bg-zinc-100 text-zinc-600",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800",
  },
};

export const SENTRY_BADGE_CONFIG: Record<
  SentryBadgeStatus,
  { label: string; className: string }
> = {
  not_configured: {
    label: "Not configured",
    className: "bg-zinc-100 text-zinc-600",
  },
};
