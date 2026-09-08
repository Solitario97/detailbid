import { listAllServices } from "@/modules/catalog/service";
import { ServicesManager } from "@/components/admin/catalog-manager";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await listAllServices();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Services</h1>
      <div className="mt-6">
        <ServicesManager services={services} />
      </div>
    </div>
  );
}
