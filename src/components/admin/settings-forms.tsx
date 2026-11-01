"use client";
import { useActionState } from "react";
import { saveSettings, saveManualAccount } from "@/app/admin/settings/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { inputCls, labelCls, cardCls } from "@/components/ui/styles";

export type SettingsValues = {
  storeName: string; supportEmail: string; supportPhone: string; whatsappNumber: string; address: string; orderEmailBcc: string;
  defaultShipping: string; freeShippingAbove: string; lowStockThreshold: number; gatewayOrderExpiryMins: number; manualOrderExpiryHours: number;
  toggles: { key: string; label: string; enabled: boolean; configured: boolean; env: string }[];
};

export function SettingsForm({ s }: { s: SettingsValues }) {
  const [state, action] = useActionState(saveSettings, null);
  return (
    <form action={action} className="space-y-6">
      <section className={`${cardCls} grid gap-4 p-5 sm:grid-cols-2`}>
        <h2 className="font-semibold sm:col-span-2">Store</h2>
        <div><label className={labelCls}>Store name</label><input name="storeName" defaultValue={s.storeName} required className={inputCls} /></div>
        <div><label className={labelCls}>Support email</label><input name="supportEmail" defaultValue={s.supportEmail} className={inputCls} /></div>
        <div><label className={labelCls}>Support phone</label><input name="supportPhone" defaultValue={s.supportPhone} className={inputCls} /></div>
        <div><label className={labelCls}>WhatsApp number</label><input name="whatsappNumber" defaultValue={s.whatsappNumber} className={inputCls} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>Address (shown in footer)</label><textarea name="address" rows={2} defaultValue={s.address} className={inputCls} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>Email new-order notifications to</label><input name="orderEmailBcc" defaultValue={s.orderEmailBcc} placeholder="orders@yourstore.pk" className={inputCls} /></div>
      </section>
      <section className={`${cardCls} grid gap-4 p-5 sm:grid-cols-3`}>
        <h2 className="font-semibold sm:col-span-3">Shipping, stock and order expiry</h2>
        <div><label className={labelCls}>Default shipping fee (Rs)</label><input name="defaultShipping" defaultValue={s.defaultShipping} inputMode="decimal" className={inputCls} /></div>
        <div><label className={labelCls}>Free shipping above (Rs)</label><input name="freeShippingAbove" defaultValue={s.freeShippingAbove} inputMode="decimal" placeholder="Off" className={inputCls} /></div>
        <div><label className={labelCls}>Low stock alert at</label><input name="lowStockThreshold" type="number" defaultValue={s.lowStockThreshold} className={inputCls} /></div>
        <div><label className={labelCls}>Card/wallet order expiry (minutes)</label><input name="gatewayOrderExpiryMins" type="number" min={15} defaultValue={s.gatewayOrderExpiryMins} className={inputCls} /></div>
        <div><label className={labelCls}>Bank transfer proof deadline (hours)</label><input name="manualOrderExpiryHours" type="number" min={1} defaultValue={s.manualOrderExpiryHours} className={inputCls} /></div>
      </section>
      <section className={`${cardCls} space-y-3 p-5`}>
        <h2 className="font-semibold">Payment methods</h2>
        <p className="text-sm text-gray-600">Gateway API keys are read from environment variables only and are never stored in the database. A method appears at checkout only if it is enabled here and its keys are configured.</p>
        {s.toggles.map((t) => (
          <label key={t.key} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <input type="checkbox" name={t.key} defaultChecked={t.enabled} className="mt-0.5" />
            <span><span className="font-medium">{t.label}</span>{" "}
              {t.configured ? <span className="text-emerald-700">· keys configured</span> : <span className="text-amber-700">· not configured ({t.env})</span>}
            </span>
          </label>
        ))}
      </section>
      <div className="flex items-center gap-3"><SubmitButton>Save settings</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}

type Acc = { id: string; type: "BANK" | "WALLET"; label: string; accountTitle: string; accountNumber: string; iban: string | null; instructions: string | null; sortOrder: number; isActive: boolean };

export function ManualAccountForm({ a }: { a?: Acc }) {
  const [state, action] = useActionState(saveManualAccount, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      {a && <input type="hidden" name="id" value={a.id} />}
      <div><label className={labelCls}>Type</label><select name="type" defaultValue={a?.type ?? "BANK"} className={inputCls}><option value="BANK">Bank</option><option value="WALLET">Mobile wallet</option></select></div>
      <div><label className={labelCls}>Bank / wallet name</label><input name="label" required defaultValue={a?.label} className={inputCls} /></div>
      <div><label className={labelCls}>Account title</label><input name="accountTitle" required defaultValue={a?.accountTitle} className={inputCls} /></div>
      <div><label className={labelCls}>Account / mobile number</label><input name="accountNumber" required defaultValue={a?.accountNumber} className={inputCls} /></div>
      <div><label className={labelCls}>IBAN</label><input name="iban" defaultValue={a?.iban ?? ""} className={inputCls} /></div>
      <div><label className={labelCls}>Sort order</label><input name="sortOrder" type="number" defaultValue={a?.sortOrder ?? 0} className={inputCls} /></div>
      <div className="sm:col-span-2"><label className={labelCls}>Instructions</label><input name="instructions" defaultValue={a?.instructions ?? ""} className={inputCls} /></div>
      <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="isActive" defaultChecked={a?.isActive ?? true} /> Show to customers</label>
      <div className="flex items-center gap-3 sm:col-span-3"><SubmitButton>{a ? "Save account" : "Add account"}</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}
