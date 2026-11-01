"use client";
import { useActionState } from "react";
import { updateProfile, changePassword, addAddress } from "@/app/(store)/account/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { inputCls, labelCls } from "@/components/ui/styles";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-3">
      <div><label className={labelCls}>Name</label><input name="name" defaultValue={name} className={inputCls} /></div>
      <div><label className={labelCls}>Mobile</label><input name="phone" defaultValue={phone} className={inputCls} /></div>
      <FormMessage state={state} /><SubmitButton>Save</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  return (
    <form action={action} className="space-y-3">
      <div><label className={labelCls}>Current password</label><input name="current" type="password" autoComplete="current-password" className={inputCls} /></div>
      <div><label className={labelCls}>New password</label><input name="next" type="password" minLength={8} autoComplete="new-password" className={inputCls} /></div>
      <FormMessage state={state} /><SubmitButton>Change password</SubmitButton>
    </form>
  );
}

export function AddressForm() {
  const [state, action] = useActionState(addAddress, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div><label className={labelCls}>Full name</label><input name="fullName" required className={inputCls} /></div>
      <div><label className={labelCls}>Mobile</label><input name="phone" required placeholder="03001234567" className={inputCls} /></div>
      <div className="sm:col-span-2"><label className={labelCls}>Address</label><input name="line1" required className={inputCls} /></div>
      <div className="sm:col-span-2"><label className={labelCls}>Apartment, landmark</label><input name="line2" className={inputCls} /></div>
      <div><label className={labelCls}>City</label><input name="city" required className={inputCls} /></div>
      <div><label className={labelCls}>Province</label><input name="province" className={inputCls} /></div>
      <div><label className={labelCls}>Postal code</label><input name="postalCode" className={inputCls} /></div>
      <div className="flex items-end gap-3 sm:col-span-2"><SubmitButton>Add address</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}
