export type ActionState = { error?: string; ok?: string; fieldErrors?: Record<string, string[] | undefined> } | null;

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>;
  return null;
}

export function FieldError({ state, name }: { state: ActionState; name: string }) {
  const msg = state?.fieldErrors?.[name]?.[0];
  return msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null;
}
