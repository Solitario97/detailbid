import { listCities } from "@/modules/catalog/service";
import { CitiesManager } from "@/components/admin/catalog-manager";

export const dynamic = "force-dynamic";

export default async function AdminCitiesPage() {
  const cities = await listCities();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Cities</h1>
      <div className="mt-6">
        <CitiesManager cities={cities} />
      </div>
    </div>
  );
}
