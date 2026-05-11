"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type Testimonial = {
  name: string;
  photo?: string;
  rating: number;
  quote: string;
  treatmentType?: string;
};

type Props = {
  testimonials: Testimonial[];
  heading?: string;
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          style={{ color: s <= rating ? "var(--clinic-primary)" : "var(--color-rule)" }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function Testimonials({ testimonials, heading = "What our patients say" }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const autoRotateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useRef(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = query.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };

    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  // Auto-rotate handler
  const startAutoRotate = useCallback(() => {
    if (autoRotateTimerRef.current) {
      clearInterval(autoRotateTimerRef.current);
    }

    if (prefersReducedMotion.current) {
      return;
    }

    setIsAutoRotating(true);
    autoRotateTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
  }, [testimonials.length]);

  const stopAutoRotate = useCallback(() => {
    setIsAutoRotating(false);
    if (autoRotateTimerRef.current) {
      clearInterval(autoRotateTimerRef.current);
    }
  }, []);

  // Setup auto-rotate on mount
  useEffect(() => {
    startAutoRotate();
    return () => {
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
      }
    };
  }, [startAutoRotate]);

  // Handle pause-on-hover
  const handleMouseEnter = () => stopAutoRotate();
  const handleMouseLeave = () => startAutoRotate();

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
      stopAutoRotate();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
      stopAutoRotate();
    }
  };

  if (testimonials.length === 0) return null;

  const current = testimonials[currentIndex];

  return (
    <section
      className="border-t border-rule bg-white py-20"
      aria-label="Patient testimonials"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
    >
      <div className="mx-auto max-w-6xl px-6">
        <p
          className="text-xs font-medium uppercase tracking-[0.22em]"
          style={{ color: "var(--clinic-primary)" }}
        >
          Testimonials
        </p>
        <h2 className="mt-3 font-display text-4xl text-ink">{heading}</h2>

        {/* Carousel Container */}
        <div
          ref={containerRef}
          className="mt-12 rounded-card border border-rule bg-canvas p-8 sm:p-12"
          role="region"
          aria-roledescription="carousel"
          aria-label={`Slide ${currentIndex + 1} of ${testimonials.length}`}
        >
          <div className="flex flex-col items-center text-center">
            {/* Photo */}
            {current.photo && (
              <div className="mb-6 h-20 w-20 overflow-hidden rounded-full">
                <Image
                  src={current.photo}
                  alt={current.name}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {/* Rating */}
            <div className="mb-4">
              <StarDisplay rating={current.rating} />
            </div>

            {/* Quote */}
            <blockquote className="mb-4 max-w-3xl text-lg leading-relaxed text-ink">
              &ldquo;{current.quote}&rdquo;
            </blockquote>

            {/* Patient name */}
            <p className="font-medium text-ink">{current.name}</p>

            {/* Treatment type */}
            {current.treatmentType && (
              <p className="mt-2 text-sm text-ink-muted">{current.treatmentType}</p>
            )}
          </div>
        </div>

        {/* Navigation Controls */}
        {testimonials.length > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            {/* Previous Button */}
            <button
              onClick={() => {
                setCurrentIndex((prev) =>
                  (prev - 1 + testimonials.length) % testimonials.length,
                );
                stopAutoRotate();
              }}
              className="rounded-lg border border-rule p-2 text-ink transition hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ "--tw-ring-color": "var(--clinic-primary)" } as React.CSSProperties}
              aria-label="Previous testimonial"
              aria-disabled={testimonials.length <= 1}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Indicators */}
            <div className="flex gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    stopAutoRotate();
                  }}
                  className={`h-2 w-2 rounded-full transition ${
                    idx === currentIndex ? "opacity-100" : "opacity-40"
                  }`}
                  style={{
                    backgroundColor: idx === currentIndex ? "var(--clinic-primary)" : "var(--color-rule)",
                  }}
                  aria-label={`Go to testimonial ${idx + 1}`}
                  aria-current={idx === currentIndex ? "true" : "false"}
                />
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={() => {
                setCurrentIndex((prev) => (prev + 1) % testimonials.length);
                stopAutoRotate();
              }}
              className="rounded-lg border border-rule p-2 text-ink transition hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ "--tw-ring-color": "var(--clinic-primary)" } as React.CSSProperties}
              aria-label="Next testimonial"
              aria-disabled={testimonials.length <= 1}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Auto-rotate status text (for screen readers) */}
        {testimonials.length > 1 && (
          <p className="sr-only">
            Auto-rotating through testimonials every 5 seconds
            {!isAutoRotating && ", paused"}
          </p>
        )}
      </div>
    </section>
  );
}
