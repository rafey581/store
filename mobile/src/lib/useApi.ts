import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api } from "./api";

/** Loads a GET endpoint when the screen gains focus; supports pull-to-refresh. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [path]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return { data, error, loading, reload: load, setData };
}
