import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dream Create",
  description:
    "Dream Create platform — admin, billing, and provisioning for the dental clinic website factory.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
