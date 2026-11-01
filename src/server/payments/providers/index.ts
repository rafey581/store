import type { GatewayProvider } from "@/server/payments/types";

// Gateway providers are registered here (Phase 3).
export const providers: Partial<Record<GatewayProvider["method"], GatewayProvider>> = {};
