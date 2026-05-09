import type {
  Clinic,
  ClinicAddress,
  ClinicHours,
  ClinicHoursDay,
  DayOfWeek,
} from "@/src/db/schema";

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DAY_ORDER: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function dayLabel(day: DayOfWeek): string {
  return DAY_LABELS[day];
}

export function orderedHours(hours: ClinicHours | null | undefined): ClinicHoursDay[] {
  if (!hours) return [];
  const byDay = new Map<DayOfWeek, ClinicHoursDay>();
  for (const h of hours) byDay.set(h.day, h);
  return DAY_ORDER.map((d) => byDay.get(d) ?? { day: d, closed: true });
}

export function formatTime(value: string | undefined): string {
  if (!value) return "";
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  const period = h >= 12 ? "pm" : "am";
  const display = ((h + 11) % 12) + 1;
  return m === 0 ? `${display}${period}` : `${display}:${String(m).padStart(2, "0")}${period}`;
}

export function formatHourRange(day: ClinicHoursDay): string {
  if (day.closed || !day.open || !day.close) return "Closed";
  return `${formatTime(day.open)} – ${formatTime(day.close)}`;
}

export function formatAddressLines(address: ClinicAddress | null | undefined): string[] {
  if (!address) return [];
  const street = [address.line1, address.line2].filter(Boolean).join(", ");
  const cityLine = `${address.city}, ${address.state} ${address.postalCode}`;
  return [street, cityLine];
}

export function formatAddressInline(
  address: ClinicAddress | null | undefined,
): string {
  return formatAddressLines(address).join(", ");
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9+]/g, "");
  return digits ? `tel:${digits}` : null;
}

export function clinicTagline(clinic: Pick<Clinic, "name" | "address">): string {
  const city = clinic.address?.city;
  return city
    ? `${clinic.name} — modern dentistry in ${city}.`
    : `${clinic.name} — modern dentistry, made personal.`;
}
