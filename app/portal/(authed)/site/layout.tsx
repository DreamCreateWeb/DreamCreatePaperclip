import type { ReactNode } from "react";

import { SiteSubNav } from "./sub-nav";

export default function PortalSiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted">
          Site content
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink">
          Edit your site
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted">
          Updates publish to your public site immediately on save.
        </p>
      </header>
      <SiteSubNav />
      <div>{children}</div>
    </div>
  );
}
