"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 48 }}>
        <h1>Something went wrong</h1>
        <p>Please refresh the page.</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
