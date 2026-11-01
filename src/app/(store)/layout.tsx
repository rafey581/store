import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";
import { VisitTracker } from "@/components/store/visit-tracker";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreHeader />
      <main className="mx-auto min-h-[60vh] max-w-7xl px-4 py-6">{children}</main>
      <StoreFooter />
      <VisitTracker />
    </>
  );
}
