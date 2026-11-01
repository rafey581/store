"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, registerAction, forgotPasswordAction, resetPasswordAction } from "@/app/(store)/(auth)/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, FieldError } from "@/components/ui/form-message";
import { inputCls, labelCls } from "@/components/ui/styles";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div><label className={labelCls} htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className={labelCls} htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className={inputCls} /></div>
      <FormMessage state={state} />
      <SubmitButton className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700" pendingText="Signing in…">Sign in</SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">Forgot password?</Link>
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand-700 hover:underline">Create account</Link>
      </div>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(registerAction, null);
  const [v, setV] = useState({ name: "", email: "", phone: "" });
  const bind = (k: keyof typeof v) => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value })) });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div><label className={labelCls} htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" required className={inputCls} {...bind("name")} /><FieldError state={state} name="name" /></div>
      <div><label className={labelCls} htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required className={inputCls} {...bind("email")} /><FieldError state={state} name="email" /></div>
      <div><label className={labelCls} htmlFor="phone">Mobile number (optional)</label><input id="phone" name="phone" type="tel" placeholder="03001234567" autoComplete="tel" className={inputCls} {...bind("phone")} /></div>
      <div><label className={labelCls} htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={inputCls} /><FieldError state={state} name="password" /></div>
      <FormMessage state={state} />
      <SubmitButton className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700" pendingText="Creating account…">Create account</SubmitButton>
      <p className="text-center text-sm">Already have an account? <Link href="/login" className="text-brand-700 hover:underline">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <div><label className={labelCls} htmlFor="email">Email</label><input id="email" name="email" type="email" required className={inputCls} /></div>
      <FormMessage state={state} />
      <SubmitButton className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div><label className={labelCls} htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={8} required className={inputCls} /></div>
      <FormMessage state={state} />
      {state?.ok ? <Link href="/login" className="block text-center font-medium text-brand-700 hover:underline">Go to sign in</Link> : <SubmitButton className="w-full rounded-lg bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700">Update password</SubmitButton>}
    </form>
  );
}
