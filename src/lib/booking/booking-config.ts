import {
  DEFAULT_BOOKING_CONFIG,
  type Clinic,
  type ClinicBookingConfig,
} from "@/src/db/schema";

export function resolveBookingConfig(
  clinic: Pick<Clinic, "bookingConfig">,
): ClinicBookingConfig {
  return { ...DEFAULT_BOOKING_CONFIG, ...(clinic.bookingConfig ?? {}) };
}
