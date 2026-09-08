import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCompanyProfile } from "@/modules/companies/service";
import { DashboardShell } from "@/components/company/dashboard-shell";

export default async function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "COMPANY" || !session.companyId) {
    redirect("/company/login");
  }

  const company = await getCompanyProfile(session.companyId);
  if (!company) redirect("/company/login");

  return (
    <DashboardShell companyName={company.name} status={company.status}>
      {children}
    </DashboardShell>
  );
}
