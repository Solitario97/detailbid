import Link from "next/link";
import { listCities } from "@/modules/catalog/service";
import { CompanyRegisterForm } from "@/components/company/auth-forms";

export const dynamic = "force-dynamic";

export default async function CompanyRegisterPage() {
  const cities = await listCities();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-dark text-sm font-bold text-white">D</span>
          <span className="text-[17px] font-semibold text-ink">DetailBid</span>
        </Link>
        <h1 className="mb-2 text-center text-xl font-semibold tracking-tight text-ink">Регистрация детейлинг-центра</h1>
        <p className="mb-6 text-center text-sm text-ink-soft">
          После регистрации заявку на подключение проверит администратор.
        </p>
        <CompanyRegisterForm cities={cities.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </main>
  );
}
