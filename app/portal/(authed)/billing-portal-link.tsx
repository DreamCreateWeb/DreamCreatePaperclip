"use client";

import { useState } from "react";

export function BillingPortalLink() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/billing/portal");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="group rounded-card border border-rule bg-white p-6 text-left transition hover:border-ink disabled:opacity-60"
    >
      <p className="text-sm font-medium text-ink">Manage billing</p>
      <p className="mt-2 text-sm text-ink-muted">
        Invoices, payment method, and subscription.
      </p>
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-accent group-hover:underline">
        {loading ? "Loading…" : "Open →"}
      </p>
    </button>
  );
}
