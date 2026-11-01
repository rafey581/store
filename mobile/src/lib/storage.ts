import * as SecureStore from "expo-secure-store";

// Android/iOS: encrypted storage (Android Keystore / iOS Keychain).
export const storage = {
  get: (k: string) => SecureStore.getItemAsync(k),
  set: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  del: (k: string) => SecureStore.deleteItemAsync(k),
};
