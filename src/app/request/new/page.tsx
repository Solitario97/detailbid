import Link from "next/link";
import { listCities, listActiveServices } from "@/modules/catalog/service";
import { RequestWizard } from "@/components/client/request-wizard";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  const [cities, services] = await Promise.all([listCities(), listActiveServices()]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-12">
        <Link href="/" className="mb-6 flex items-center gap-2 self-start">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-dark text-xs font-bold text-white">D</span>
          <span className="text-sm font-semibold text-ink">DetailBid</span>
        </Link>
        <RequestWizard
          cities={cities.map((c) => ({ id: c.id, name: c.name }))}
          services={services.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </main>
  );
}
