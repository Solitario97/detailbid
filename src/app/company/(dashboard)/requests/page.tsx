import { listCities, listActiveServices } from "@/modules/catalog/service";
import { CompanyRequestsView } from "@/components/company/requests-view";

export const dynamic = "force-dynamic";

export default async function CompanyRequestsPage() {
  const [cities, services] = await Promise.all([listCities(), listActiveServices()]);
  return (
    <CompanyRequestsView
      cities={cities.map((c) => ({ id: c.id, name: c.name }))}
      services={services.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
