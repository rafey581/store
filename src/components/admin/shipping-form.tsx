"use client";
import { useActionState } from "react";
import { saveShippingRate } from "@/app/admin/shipping/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

const cell = "w-full rounded border px-2 py-1 text-sm";

export function ShippingRow({ r }: { r?: { id: string; city: string; province: string; fee: string; freeAbove: string; minDays: number; maxDays: number; isActive: boolean } }) {
  const [state, action] = useActionState(saveShippingRate, null);
  return (
    <form action={action} className="grid grid-cols-2 items-center gap-2 border-t py-2 sm:grid-cols-[1.5fr_1.5fr_1fr_1fr_0.6fr_0.6fr_auto_auto]">
      {r && <input type="hidden" name="id" value={r.id} />}
      <input name="city" required defaultValue={r?.city} placeholder="City" className={cell} aria-label="City" />
      <input name="province" defaultValue={r?.province} placeholder="Province" className={cell} aria-label="Province" />
      <input name="fee" required defaultValue={r?.fee} placeholder="Fee (Rs)" inputMode="decimal" className={cell} aria-label="Fee" />
      <input name="freeAbove" defaultValue={r?.freeAbove} placeholder="Free above (Rs)" inputMode="decimal" className={cell} aria-label="Free above" />
      <input name="minDays" type="number" defaultValue={r?.minDays ?? 2} className={cell} aria-label="Min days" />
      <input name="maxDays" type="number" defaultValue={r?.maxDays ?? 5} className={cell} aria-label="Max days" />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="isActive" defaultChecked={r?.isActive ?? true} /> Active</label>
      <div className="flex items-center gap-2"><SubmitButton className="rounded bg-brand-600 px-3 py-1 text-xs font-semibold text-white">{r ? "Save" : "Add"}</SubmitButton>{(state?.error || state?.ok) && <span className={`text-xs ${state.error ? "text-red-600" : "text-emerald-700"}`}>{state.error || state.ok}</span>}</div>
      <span className="hidden"><FormMessage state={null} /></span>
    </form>
  );
}
