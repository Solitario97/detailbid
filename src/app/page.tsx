import { HomeGate } from "@/components/marketing/home-gate";

// The landing page defers to a client component because restoring a
// visitor's active request (see src/lib/client-request-storage.ts) needs
// localStorage + a fetch, which only exist client-side. HomeGate renders
// the exact same marketing sections this page used to render directly
// once it determines there's nothing to restore.
export default function LandingPage() {
  return <HomeGate />;
}
