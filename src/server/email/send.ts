import { db } from "@/server/db";

// Sends through Resend (https://resend.com) when RESEND_API_KEY is set.
// Otherwise the email is printed to the server console (development) and
// logged as FAILED with reason "not configured" so nothing is silently lost.

export type EmailInput = { to: string; subject: string; html: string; template: string; orderId?: string | null; bcc?: string | null };

export async function sendEmail(input: EmailInput): Promise<boolean> {
  const log = await db.emailLog.create({ data: { to: input.to, subject: input.subject, template: input.template, orderId: input.orderId ?? null } }).catch(() => null);
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Store <onboarding@resend.dev>";
  try {
    if (!key) {
      console.info(`[email:not-configured] to=${input.to} subject="${input.subject}" template=${input.template}`);
      if (log) await db.emailLog.update({ where: { id: log.id }, data: { status: "FAILED", error: "RESEND_API_KEY not configured (printed to console)" } });
      return false;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], bcc: input.bcc ? [input.bcc] : undefined, subject: input.subject, html: input.html }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    if (log) await db.emailLog.update({ where: { id: log.id }, data: { status: "SENT" } });
    return true;
  } catch (e) {
    console.error("sendEmail failed", e);
    if (log) await db.emailLog.update({ where: { id: log.id }, data: { status: "FAILED", error: String(e).slice(0, 500) } }).catch(() => {});
    return false;
  }
}
