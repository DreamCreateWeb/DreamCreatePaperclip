# Dental Component Library

All components live in `src/components/clinic/` and are re-exported from `src/components/clinic/index.ts`.

---

## ClinicHeader

`import { ClinicHeader } from "@/src/components/clinic"`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clinic` | `Clinic` | ✅ | Full clinic row from DB |
| `basePath` | `string` | ✅ | e.g. `/sites/musallam` |
| `current` | `"home" \| "services" \| "team" \| "contact"` | — | Active nav item |

---

## ClinicHero

`import { ClinicHero } from "@/src/components/clinic"`

The default "warm" template hero. Full-width split layout: text left, brand-coloured image card right (desktop only).

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clinic` | `Clinic` | ✅ | Full clinic row |
| `basePath` | `string` | ✅ | Prefix for internal links |

---

## ClinicHeroModern

`import { ClinicHeroModern } from "@/src/components/clinic"`

The "modern" template hero. Centered, white background, thin accent bar at top, with trust badges below the CTAs. Used automatically when `clinic.brand.template === "modern"`.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clinic` | `Clinic` | ✅ | Full clinic row |
| `basePath` | `string` | ✅ | Prefix for internal links |

---

## ServicesGrid

`import { ServicesGrid } from "@/src/components/clinic"`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `services` | `ClinicService[]` | ✅ | Array of `{ name, description? }` |
| `heading` | `string` | — | Section heading |
| `intro` | `string` | — | Subheading paragraph |

Returns `null` when `services` is empty.

---

## TeamGrid

`import { TeamGrid } from "@/src/components/clinic"`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `team` | `ClinicTeamMember[]` | ✅ | Array of `{ name, role, bio?, photoUrl? }` |
| `heading` | `string` | — | Section heading |
| `intro` | `string` | — | Subheading paragraph |

Returns `null` when `team` is empty.

---

## ReviewsSection

`import { ReviewsSection } from "@/src/components/clinic"`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `reviews` | `Review[]` | ✅ | Published reviews |
| `avgRating` | `number` | ✅ | Pre-computed average (0–5) |
| `reviewCount` | `number` | ✅ | Total published count |
| `basePath` | `string` | ✅ | For "leave a review" link |

---

## InsuranceCarousel

`import { InsuranceCarousel, type InsuranceProvider } from "@/src/components/clinic"`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `providers` | `InsuranceProvider[]` | ✅ | Array of `{ name, logoUrl? }` |
| `heading` | `string` | — | Label above the row |

When `logoUrl` is absent, renders a pill badge with the insurer name. When present, renders a greyscale logo that saturates on hover.

**Example:**
```tsx
<InsuranceCarousel
  providers={[
    { name: "Delta Dental" },
    { name: "Cigna", logoUrl: "/images/cigna.svg" },
  ]}
  heading="We accept most major insurance plans"
/>
```

---

## BeforeAfterGallery

`import { BeforeAfterGallery, type BeforeAfterPair } from "@/src/components/clinic"`

Client component — uses `"use client"`.

> **Note:** This component is exported and production-ready but is not yet wired into the default home page template (`app/sites/[slug]/page.tsx`). See engineering backlog for the wiring ticket.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pairs` | `BeforeAfterPair[]` | ✅ | Array of before/after image pairs |
| `heading` | `string` | — | Section heading |
| `intro` | `string` | — | Subheading paragraph |

`BeforeAfterPair`:
```ts
type BeforeAfterPair = {
  label: string;           // e.g. "Whitening"
  before: { src: string; alt: string };
  after:  { src: string; alt: string };
};
```

Displays the active pair with a Before/After toggle button. Shows thumbnails when more than one pair is provided.

---

## HoursLocationCard

`import { HoursLocationCard } from "@/src/components/clinic"`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clinic` | `Clinic` | ✅ | Full clinic row |
| `basePath` | `string` | ✅ | For contact-page link |

---

## MapEmbed

`import { MapEmbed } from "@/src/components/clinic"`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `address` | `ClinicAddress` | ✅ | Structured address from DB |

---

## CtaBand

`import { CtaBand } from "@/src/components/clinic"`

Full-width, brand-coloured appointment CTA section. Best placed near the bottom of the page.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clinic` | `Clinic` | ✅ | Full clinic row |
| `basePath` | `string` | ✅ | For booking link |

---

## StickyCtaBar

`import { StickyCtaBar } from "@/src/components/clinic"`

Fixed bottom bar visible **only on mobile** (`md:hidden`). Renders a "Book Appointment" CTA and an optional "Call" button.

Place this **outside `<main>`** so it doesn't push content.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clinic` | `Clinic` | ✅ | Full clinic row |
| `basePath` | `string` | ✅ | For booking link |

**Usage:**
```tsx
<StickyCtaBar clinic={clinic} basePath={basePath} />
```

---

## ContactForm

`import { ContactForm } from "@/src/components/clinic"`

Client component — submits to `POST /api/clinic/contact`.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clinicId` | `string` | ✅ | UUID of the clinic |

---

## ReviewForm

`import { ReviewForm } from "@/src/components/clinic"`

Client component — submits to `POST /api/clinic/reviews`.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clinicId` | `string` | ✅ | UUID of the clinic |

---

## ClinicFooter

`import { ClinicFooter } from "@/src/components/clinic"`

Four-column grid footer: clinic name/tagline, address, contact info, and office hours. Auto-populated from clinic data. Rendered by the site layout (`app/sites/[slug]/layout.tsx`) — do not add it inside a page component.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clinic` | `Clinic` | ✅ | Full clinic row |
| `basePath` | `string` | ✅ | For internal links (e.g. contact page) |

---

## ClinicProvider

`import { ClinicProvider } from "@/src/components/clinic"`

Context provider that makes the current `Clinic` object available to descendant client components via `useClinic()`. Wrap the site layout or page with this if you need to access clinic data in deep client components.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `clinic` | `Clinic` | ✅ | Full clinic row |
| `children` | `React.ReactNode` | ✅ | Subtree |

---

## Theming

All components read CSS custom properties for branding. Set by `brandStyle()` from `src/lib/clinic/brand.ts`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `--clinic-primary` | `#1e6fcc` | Brand colour (buttons, accents) |
| `--clinic-primary-fg` | `#ffffff` | Foreground on primary bg |
| `--clinic-primary-soft` | 10% alpha of primary | Light tint backgrounds |
| `--clinic-accent` | same as primary | Decorative accent |
