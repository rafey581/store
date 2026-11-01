import type { PaymentMethod } from "@/generated/prisma/enums";

export type InitiateContext = {
  order: { id: string; number: number; email: string; phone: string; customerName: string; totalPaisa: number; trackingToken: string };
  payment: { id: string; reference: string; amountPaisa: number };
  /** Where the customer's browser returns (display only, never trusted). */
  returnUrl: string;
  /** Server-to-server callback / IPN URL for this provider. */
  callbackUrl: string;
};

export type InitiateResult = (
  | { type: "redirect"; url: string }
  | { type: "form"; action: string; fields: Record<string, string> }
) & { providerData?: Record<string, unknown>; providerTxnId?: string };

/** Result of a callback that has been verified server-side (signature and/or a
 *  server-to-server status query). Only SUCCEEDED results can mark an order paid. */
export type VerifiedCallback = {
  signatureValid: boolean;
  reference: string | null; // our Payment.reference
  providerTxnId: string | null;
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  amountPaisa: number | null; // amount the provider says was paid
  eventKey: string; // unique per provider event, for idempotency
  payload: unknown; // stored for audit (secrets removed)
  message?: string;
};

export interface GatewayProvider {
  method: Exclude<PaymentMethod, "MANUAL_TRANSFER" | "COD">;
  label: string;
  /** All required env vars present. */
  isConfigured(): boolean;
  initiate(ctx: InitiateContext): Promise<InitiateResult>;
  /** Parses and verifies an inbound callback request. Must not trust anything it cannot verify. */
  verifyCallback(input: { rawBody: string; headers: Headers; query: URLSearchParams; contentType: string }): Promise<VerifiedCallback>;
  /** Optional: query the provider directly for the status of a payment reference. */
  queryStatus?(reference: string, payment: { amountPaisa: number; createdAt: Date; providerTxnId: string | null }): Promise<VerifiedCallback | null>;
}
