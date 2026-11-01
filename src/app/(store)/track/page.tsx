import type { Metadata } from "next";
import { TrackForm } from "@/components/store/track-form";
import { AuthShell } from "@/components/store/auth-shell";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackPage() {
  return (
    <div className="py-4 sm:py-8">
      <AuthShell title="Track your order" subtitle="Enter your order number and the email or mobile number you used at checkout.">
        <TrackForm />
      </AuthShell>
    </div>
  );
}
