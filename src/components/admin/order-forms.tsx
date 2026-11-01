"use client";
import { useActionState } from "react";
import { changeOrderStatus, saveFulfilment } from "@/app/admin/orders/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { inputCls, labelCls } from "@/components/ui/styles";
import { ORDER_STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/generated/prisma/enums";

export function StatusForm({ orderId, options, courierName, trackingNumber }: { orderId: string; options: OrderStatus[]; courierName: string; trackingNumber: string }) {
  const [state, action] = useActionState(changeOrderStatus, null);
  if (options.length === 0) return <p className="text-sm text-gray-500">No further status changes are available.</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div><label className={labelCls}>New status</label>
        <select name="to" className={inputCls}>{options.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Courier</label><input name="courierName" defaultValue={courierName} placeholder="TCS, Leopards, M&P…" className={inputCls} /></div>
        <div><label className={labelCls}>Tracking no.</label><input name="trackingNumber" defaultValue={trackingNumber} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Note (shown to customer)</label><input name="note" className={inputCls} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked /> Email the customer</label>
      <FormMessage state={state} />
      <SubmitButton>Update status</SubmitButton>
    </form>
  );
}

export function FulfilmentForm({ orderId, courierName, trackingNumber, trackingUrl, adminNote }: { orderId: string; courierName: string; trackingNumber: string; trackingUrl: string; adminNote: string }) {
  const [state, action] = useActionState(saveFulfilment, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Courier</label><input name="courierName" defaultValue={courierName} className={inputCls} /></div>
        <div><label className={labelCls}>Tracking no.</label><input name="trackingNumber" defaultValue={trackingNumber} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Tracking URL</label><input name="trackingUrl" defaultValue={trackingUrl} placeholder="https://" className={inputCls} /></div>
      <div><label className={labelCls}>Internal note</label><textarea name="adminNote" rows={3} defaultValue={adminNote} className={inputCls} /></div>
      <FormMessage state={state} />
      <SubmitButton className="rounded-lg border px-4 py-2 text-sm font-semibold">Save</SubmitButton>
    </form>
  );
}
