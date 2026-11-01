import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/server/settings";
import { siteUrl } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.storeName, template: `%s | ${s.storeName}` },
    description: `Shop online at ${s.storeName}. Delivery across Pakistan.`,
    openGraph: { siteName: s.storeName, type: "website", locale: "en_PK" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#059669" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
