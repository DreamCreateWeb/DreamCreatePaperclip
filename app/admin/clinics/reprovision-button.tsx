"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReprovisionButton({ clinicId }: { clinicId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    url?: string;
    error?: string;
  } | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `/api/admin/clinics/${encodeURIComponent(clinicId)}/reprovision`,
        { method: "POST" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        vercelDeploymentUrl?: string;
        error?: string;
      };

      if (res.ok && body.ok) {
        setResult({ ok: true, url: body.vercelDeploymentUrl ?? undefined });
        router.refresh();
      } else {
        setResult({ ok: false, error: body.error ?? "server_error" });
      }
    } catch {
      setResult({ ok: false, error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-pill bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Re-provisioning…
          </span>
        ) : (
          "Re-provision"
        )}
      </button>
      {result ? (
        result.ok ? (
          <p className="text-xs text-emerald-700">
            Re-provisioned.{" "}
            {result.url ? (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {result.url}
              </a>
            ) : null}
          </p>
        ) : (
          <p className="text-xs text-red-600">{result.error}</p>
        )
      ) : null}
    </div>
  );
}
