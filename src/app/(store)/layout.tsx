import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";
import { VisitTracker } from "@/components/store/visit-tracker";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { getSettings } from "@/server/settings";
import { siteUrl } from "@/lib/utils";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const org = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: s.storeName,
    url: siteUrl("/"),
    ...(s.logoUrl ? { logo: s.logoUrl } : {}),
    ...(s.supportEmail || s.supportPhone ? { contactPoint: { "@type": "ContactPoint", contactType: "customer service", email: s.supportEmail ?? undefined, telephone: s.supportPhone ?? undefined, areaServed: "PK" } } : {}),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org).replace(/</g, "\\u003c") }} />
      {s.announcement && <div className="bg-ink-900 px-4 py-2 text-center text-xs font-medium tracking-wide text-gray-200 sm:text-sm"><span className="text-brand-400">●</span> {s.announcement}</div>}
      <StoreHeader />
      <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-6 sm:py-8">{children}</main>
      <StoreFooter />
      <VisitTracker />
      {s.whatsappNumber && <WhatsAppButton number={s.whatsappNumber} storeName={s.storeName} />}
    </>
  );
}
