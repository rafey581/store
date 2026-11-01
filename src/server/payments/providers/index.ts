import type { GatewayProvider } from "@/server/payments/types";
import { safepay } from "./safepay";
import { payfast } from "./payfast";
import { jazzcash } from "./jazzcash";
import { easypaisa } from "./easypaisa";

export const providers: Partial<Record<GatewayProvider["method"], GatewayProvider>> = {
  SAFEPAY: safepay,
  PAYFAST: payfast,
  JAZZCASH: jazzcash,
  EASYPAISA: easypaisa,
};
