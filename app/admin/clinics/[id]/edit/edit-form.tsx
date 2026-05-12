"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  ClinicBrand,
  ClinicHours,
  ClinicService,
  ClinicTeamMember,
  ClinicTemplate,
} from "@/src/db/schema";

type Props = {
  clinicId: string;
  initial: {
    name: string;
    services: ClinicService[];
    team: ClinicTeamMember[];
    brand: ClinicBrand | null;
    hours: ClinicHours | null;
  };
};

const TEMPLATES: ClinicTemplate[] = ["warm", "modern", "ortho", "pediatric"];

export function EditForm({ clinicId, initial }: Props) {
  const router = useRouter();

  const [name, setName] = useState(initial.name);
  const [servicesJson, setServicesJson] = useState(
    JSON.stringify(initial.services, null, 2),
  );
  const [teamJson, setTeamJson] = useState(
    JSON.stringify(initial.team, null, 2),
  );
  const [hoursJson, setHoursJson] = useState(
    initial.hours ? JSON.stringify(initial.hours, null, 2) : "",
  );
  const [primaryColor, setPrimaryColor] = useState(
    initial.brand?.primaryColor ?? "",
  );
  const [accentColor, setAccentColor] = useState(
    initial.brand?.accentColor ?? "",
  );
  const [template, setTemplate] = useState<ClinicTemplate | "">(
    initial.brand?.template ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    deployed?: boolean;
    error?: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    let services: ClinicService[] | undefined;
    let team: ClinicTeamMember[] | undefined;
    let hours: ClinicHours | undefined;

    try {
      services = JSON.parse(servicesJson) as ClinicService[];
    } catch {
      setResult({ ok: false, error: "Services field is not valid JSON." });
      setSaving(false);
      return;
    }

    try {
      team = JSON.parse(teamJson) as ClinicTeamMember[];
    } catch {
      setResult({ ok: false, error: "Team field is not valid JSON." });
      setSaving(false);
      return;
    }

    if (hoursJson.trim()) {
      try {
        hours = JSON.parse(hoursJson) as ClinicHours;
      } catch {
        setResult({ ok: false, error: "Hours field is not valid JSON." });
        setSaving(false);
        return;
      }
    }

    const brand: ClinicBrand = {
      ...initial.brand,
      ...(primaryColor ? { primaryColor } : {}),
      ...(accentColor ? { accentColor } : {}),
      ...(template ? { template } : {}),
    };

    try {
      const res = await fetch(
        `/api/admin/clinics/${encodeURIComponent(clinicId)}/edit`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            services,
            team,
            brand,
            ...(hours ? { hours } : {}),
          }),
        },
      );

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        deployed?: boolean;
        error?: string;
      };

      if (res.ok && body.ok) {
        setResult({ ok: true, deployed: body.deployed });
        router.refresh();
      } else {
        setResult({ ok: false, error: body.error ?? "server_error" });
      }
    } catch {
      setResult({ ok: false, error: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-card border border-rule bg-white p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Basic info
        </h2>
        <div className="mt-4">
          <label className="block text-xs font-medium text-ink-muted">
            Clinic name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-card border border-rule bg-white p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Brand
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted">
              Primary color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={primaryColor || "#000000"}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-rule"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#000000"
                className="flex-1 rounded border border-rule px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted">
              Accent color
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={accentColor || "#000000"}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-rule"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#000000"
                className="flex-1 rounded border border-rule px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted">
              Template
            </label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as ClinicTemplate | "")}
              className="mt-1 w-full rounded border border-rule px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              <option value="">— default —</option>
              {TEMPLATES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-rule bg-white p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Services
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          JSON array of <code>{`{ name, description? }`}</code> objects.
        </p>
        <textarea
          value={servicesJson}
          onChange={(e) => setServicesJson(e.target.value)}
          rows={8}
          spellCheck={false}
          className="mt-2 w-full rounded border border-rule px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <div className="rounded-card border border-rule bg-white p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Team
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          JSON array of <code>{`{ name, role, bio?, photoUrl? }`}</code> objects.
        </p>
        <textarea
          value={teamJson}
          onChange={(e) => setTeamJson(e.target.value)}
          rows={8}
          spellCheck={false}
          className="mt-2 w-full rounded border border-rule px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <div className="rounded-card border border-rule bg-white p-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
          Hours
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          JSON array of{" "}
          <code>{`{ day, closed, open?, close? }`}</code>. Days:{" "}
          <code>mon tue wed thu fri sat sun</code>. Leave blank to keep existing.
        </p>
        <textarea
          value={hoursJson}
          onChange={(e) => setHoursJson(e.target.value)}
          rows={10}
          spellCheck={false}
          className="mt-2 w-full rounded border border-rule px-3 py-2 font-mono text-xs text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-pill bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-ink disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving…
            </span>
          ) : (
            "Save & redeploy"
          )}
        </button>

        {result ? (
          result.ok ? (
            <p className="text-xs text-emerald-700">
              Saved.{" "}
              {result.deployed
                ? "Vercel redeploy triggered."
                : "No Vercel project linked — changes committed to GitHub only."}
            </p>
          ) : (
            <p className="text-xs text-red-600">{result.error}</p>
          )
        ) : null}
      </div>
    </form>
  );
}
