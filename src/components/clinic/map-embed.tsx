import { formatAddressInline } from "@/src/lib/clinic/format";
import type { ClinicAddress } from "@/src/db/schema";

type Props = {
  address: ClinicAddress | null | undefined;
  clinicName: string;
};

export function MapEmbed({ address, clinicName }: Props) {
  const inline = formatAddressInline(address);
  if (!inline) return null;
  const query = encodeURIComponent(`${clinicName}, ${inline}`);
  const src = `https://www.google.com/maps?q=${query}&output=embed`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  return (
    <div className="overflow-hidden rounded-card border border-rule bg-white">
      <div className="relative aspect-[5/3] w-full bg-ink/5">
        <iframe
          title={`Map to ${clinicName}`}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
          allowFullScreen
        />
      </div>
      <div className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
        <p className="text-ink-muted">{inline}</p>
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          className="font-medium hover:underline"
          style={{ color: "var(--clinic-primary)" }}
        >
          Directions →
        </a>
      </div>
    </div>
  );
}
