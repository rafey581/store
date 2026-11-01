import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireCustomer } from "@/server/auth/session";
import { AddressForm } from "@/components/store/account-forms";
import { deleteAddress, setDefaultAddress } from "../actions";
import { cardCls } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireCustomer("/account/addresses");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Addresses</h1><Link href="/account" className="text-sm text-brand-700 hover:underline">Back to account</Link></div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className={`${cardCls} p-4 text-sm`}>
            {a.isDefault && <p className="mb-1 text-xs font-semibold text-brand-700">DEFAULT</p>}
            <p className="font-medium">{a.fullName}</p><p>{a.line1}</p>{a.line2 && <p>{a.line2}</p>}<p>{a.city}{a.province ? `, ${a.province}` : ""}</p><p>{a.phone}</p>
            <div className="mt-3 flex gap-4">
              {!a.isDefault && <form action={setDefaultAddress}><input type="hidden" name="id" value={a.id} /><button className="text-brand-700 hover:underline">Make default</button></form>}
              <form action={deleteAddress}><input type="hidden" name="id" value={a.id} /><button className="text-red-600 hover:underline">Delete</button></form>
            </div>
          </li>
        ))}
      </ul>
      <section className={`${cardCls} p-5`}><h2 className="mb-3 font-semibold">Add address</h2><AddressForm /></section>
    </div>
  );
}
