import { listCompaniesForAdmin } from "@/modules/companies/service";
import { CompaniesTable } from "@/components/admin/companies-table";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const companies = await listCompaniesForAdmin();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Companies</h1>
      <div className="mt-6">
        <CompaniesTable
          companies={companies.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            city: { name: c.city.name },
            createdAt: c.createdAt.toISOString(),
            _count: c._count,
          }))}
        />
      </div>
    </div>
  );
}
