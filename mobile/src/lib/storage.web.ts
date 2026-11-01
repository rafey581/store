// Web build (used only for browser-based testing of the screens): localStorage.
export const storage = {
  get: async (k: string) => globalThis.localStorage?.getItem(k) ?? null,
  set: async (k: string, v: string) => globalThis.localStorage?.setItem(k, v),
  del: async (k: string) => globalThis.localStorage?.removeItem(k),
};
