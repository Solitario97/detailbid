import Link from "next/link";
import Image from "next/image";
import { listCities, listActiveServices } from "@/modules/catalog/service";
import { RequestWizard } from "@/components/client/request-wizard";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  const [cities, services] = await Promise.all([listCities(), listActiveServices()]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:py-12">
        <Link href="/" className="mb-6 flex items-center gap-2 self-center">
          <Image src="/autopick-logo.png" alt="AutoPick" width={150} height={150} className="rounded-2xl object-contain" />
        </Link>
        <RequestWizard
          cities={cities.map((c) => ({ id: c.id, name: c.name }))}
          services={services.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </main>
  );
}
