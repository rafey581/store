import { db } from "@/server/db";
import { requireOwner } from "@/server/auth/session";
import { getSettings } from "@/server/settings";
import { isGatewayConfigured } from "@/server/payments";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm, ManualAccountForm } from "@/components/admin/settings-forms";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { deleteManualAccount } from "./actions";
import { paisaToRupeeInput } from "@/lib/money";
import { cardCls } from "@/components/ui/styles";

export const metadata = { title: "Store settings" };

export default async function SettingsPage() {
  await requireOwner();
  const [s, accounts] = await Promise.all([getSettings(), db.manualPaymentAccount.findMany({ orderBy: { sortOrder: "asc" } })]);
  const toggles = [
    { key: "enableSafepay", label: "Safepay (card)", enabled: s.enableSafepay, configured: isGatewayConfigured("SAFEPAY"), env: "SAFEPAY_*" },
    { key: "enablePayfast", label: "PayFast (card)", enabled: s.enablePayfast, configured: isGatewayConfigured("PAYFAST"), env: "PAYFAST_*" },
    { key: "enableJazzcash", label: "JazzCash (wallet)", enabled: s.enableJazzcash, configured: isGatewayConfigured("JAZZCASH"), env: "JAZZCASH_*" },
    { key: "enableEasypaisa", label: "Easypaisa (wallet)", enabled: s.enableEasypaisa, configured: isGatewayConfigured("EASYPAISA"), env: "EASYPAISA_*" },
    { key: "enableManualTransfer", label: "Bank / wallet transfer with proof upload", enabled: s.enableManualTransfer, configured: true, env: "" },
    { key: "enableCod", label: "Cash on delivery", enabled: s.enableCod, configured: true, env: "" },
  ];
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Store settings" />
      <SettingsForm s={{ storeName: s.storeName, supportEmail: s.supportEmail ?? "", supportPhone: s.supportPhone ?? "", whatsappNumber: s.whatsappNumber ?? "", address: s.address ?? "", orderEmailBcc: s.orderEmailBcc ?? "", defaultShipping: paisaToRupeeInput(s.defaultShippingPaisa), freeShippingAbove: paisaToRupeeInput(s.freeShippingAbovePaisa), lowStockThreshold: s.lowStockThreshold, gatewayOrderExpiryMins: s.gatewayOrderExpiryMins, manualOrderExpiryHours: s.manualOrderExpiryHours, codFee: paisaToRupeeInput(s.codFeePaisa || null), codMaxOrder: paisaToRupeeInput(s.codMaxOrderPaisa), heroTitle: s.heroTitle ?? "", heroSubtitle: s.heroSubtitle ?? "", announcement: s.announcement ?? "", toggles }} />
      <section className={`${cardCls} space-y-4 p-5`}>
        <h2 className="font-semibold">Bank and wallet accounts for manual transfer</h2>
        {accounts.map((a) => (
          <details key={a.id} className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm"><b>{a.label}</b> · {a.accountNumber}{a.isActive ? "" : " · hidden"}</summary>
            <div className="mt-3 space-y-2"><ManualAccountForm a={a} /><form action={deleteManualAccount}><input type="hidden" name="id" value={a.id} /><ConfirmButton message="Delete this account?" className="text-sm text-red-600 hover:underline">Delete</ConfirmButton></form></div>
          </details>
        ))}
        <div className="border-t pt-4"><h3 className="mb-2 text-sm font-semibold">Add account</h3><ManualAccountForm /></div>
      </section>
    </div>
  );
}
