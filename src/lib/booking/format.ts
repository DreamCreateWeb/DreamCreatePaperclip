import { resolveBookingConfig } from "./booking-config";
import type { Appointment, Clinic } from "@/src/db/schema";
import { formatInZone } from "./timezone";

export function formatBookingTime(
  appointment: Pick<Appointment, "startsAt" | "endsAt">,
  clinic: Pick<Clinic, "bookingConfig">,
): string {
  const tz = resolveBookingConfig(clinic).timezone;
  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);
  const datePart = formatInZone(start, tz, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timePart = `${formatInZone(start, tz, {
    hour: "numeric",
    minute: "2-digit",
  })} – ${formatInZone(end, tz, { hour: "numeric", minute: "2-digit" })}`;
  return `${datePart} · ${timePart}`;
}

export function formatBookingDate(
  appointment: Pick<Appointment, "startsAt">,
  clinic: Pick<Clinic, "bookingConfig">,
): string {
  const tz = resolveBookingConfig(clinic).timezone;
  return formatInZone(new Date(appointment.startsAt), tz, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatBookingClock(
  appointment: Pick<Appointment, "startsAt" | "endsAt">,
  clinic: Pick<Clinic, "bookingConfig">,
): string {
  const tz = resolveBookingConfig(clinic).timezone;
  const start = formatInZone(new Date(appointment.startsAt), tz, {
    hour: "numeric",
    minute: "2-digit",
  });
  const end = formatInZone(new Date(appointment.endsAt), tz, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}
