"use client";
import { useActionState } from "react";
import { createStaff } from "@/app/admin/staff/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { inputCls, labelCls } from "@/components/ui/styles";

export function StaffForm() {
  const [state, action] = useActionState(createStaff, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <div><label className={labelCls}>Name</label><input name="name" required className={inputCls} /></div>
      <div><label className={labelCls}>Email</label><input name="email" type="email" required className={inputCls} /></div>
      <div><label className={labelCls}>Temporary password</label><input name="password" type="text" minLength={10} required autoComplete="off" className={inputCls} /></div>
      <div><label className={labelCls}>Role</label><select name="role" className={inputCls}><option value="STAFF">Staff</option><option value="OWNER">Owner</option></select></div>
      <div className="flex items-center gap-3 sm:col-span-4"><SubmitButton>Add staff member</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}
