import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCompanyProfile } from "@/modules/companies/service";
import { listCities } from "@/modules/catalog/service";
import { CompanyProfileForm } from "@/components/company/profile-form";

export const dynamic = "force-dynamic";

export default async function CompanyProfilePage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/company/login");

  const [company, cities] = await Promise.all([getCompanyProfile(session.companyId), listCities()]);
  if (!company) redirect("/company/login");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Профиль компании</h1>
      <CompanyProfileForm
        profile={{
          name: company.name,
          description: company.description,
          logoUrl: company.logoUrl,
          phone: company.phone,
          whatsapp: company.whatsapp,
          instagram: company.instagram,
          twoGisUrl: company.twoGisUrl,
          address: company.address,
          cityId: company.cityId,
        }}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
