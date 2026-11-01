import type { Metadata } from "next";
import { TrackForm } from "@/components/store/track-form";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-6 text-2xl font-bold">Track your order</h1>
      <TrackForm />
    </div>
  );
}
