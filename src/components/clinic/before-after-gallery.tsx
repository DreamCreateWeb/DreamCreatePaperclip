"use client";

import { useState } from "react";
import Image from "next/image";

import type { BeforeAfterPair } from "@/src/db/schema";

export type { BeforeAfterPair };

type Props = {
  pairs: BeforeAfterPair[];
  heading?: string;
  intro?: string;
};

export function BeforeAfterGallery({ pairs, heading, intro }: Props) {
  const [active, setActive] = useState(0);
  const [view, setView] = useState<"before" | "after">("after");

  if (pairs.length === 0) return null;

  const current = pairs[active];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      {heading ? (
        <header className="mb-10 max-w-2xl">
          <p
            className="text-xs font-medium uppercase tracking-[0.22em]"
            style={{ color: "var(--clinic-primary)" }}
          >
            Results
          </p>
          <h2 className="mt-3 font-display text-4xl text-ink sm:text-5xl">
            {heading}
          </h2>
          {intro ? (
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">{intro}</p>
          ) : null}
        </header>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        {/* Main image */}
        <div className="overflow-hidden rounded-card border border-rule bg-white">
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <Image
              src={view === "before" ? current.before.src : current.after.src}
              alt={view === "before" ? current.before.alt : current.after.alt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 700px"
            />
            <span
              className="absolute left-3 top-3 rounded-pill px-3 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{
                background: "var(--clinic-primary)",
                color: "var(--clinic-primary-fg, #fff)",
              }}
            >
              {view === "before" ? "Before" : "After"}
            </span>
          </div>
          {/* Toggle */}
          <div className="flex items-center gap-2 border-t border-rule p-4">
            <button
              onClick={() => setView("before")}
              aria-pressed={view === "before"}
              className={`flex-1 rounded-pill py-2 text-sm font-medium transition ${
                view === "before"
                  ? "bg-ink text-white"
                  : "bg-surface text-ink-muted hover:bg-ink/5"
              }`}
            >
              Before
            </button>
            <button
              onClick={() => setView("after")}
              aria-pressed={view === "after"}
              className={`flex-1 rounded-pill py-2 text-sm font-medium transition ${
                view === "after"
                  ? "text-white"
                  : "bg-surface text-ink-muted hover:bg-ink/5"
              }`}
              style={view === "after" ? { background: "var(--clinic-primary)" } : {}}
            >
              After
            </button>
          </div>
        </div>

        {/* Thumbnail list */}
        {pairs.length > 1 && (
          <ul className="flex gap-3 overflow-x-auto lg:flex-col lg:overflow-x-visible">
            {pairs.map((pair, idx) => (
              <li key={idx}>
                <button
                  onClick={() => { setActive(idx); setView("after"); }}
                  className={`block w-20 overflow-hidden rounded-card border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--clinic-primary)] focus-visible:ring-offset-2 ${
                    idx === active ? "border-accent" : "border-rule hover:border-ink/30"
                  }`}
                  aria-label={pair.label}
                >
                  <Image
                    src={pair.after.src}
                    alt={pair.after.alt}
                    width={80}
                    height={80}
                    className="aspect-square w-full object-cover"
                    sizes="80px"
                  />
                </button>
                <p className="mt-1 text-center text-xs text-ink-muted">{pair.label}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
