import Link from "next/link";
import { CompanyLoginForm } from "@/components/company/auth-forms";

export default function CompanyLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-dark text-sm font-bold text-white">D</span>
          <span className="text-[17px] font-semibold text-ink">DetailBid</span>
        </Link>
        <h1 className="mb-6 text-center text-xl font-semibold tracking-tight text-ink">Кабинет детейлинг-компании</h1>
        <CompanyLoginForm />
      </div>
    </main>
  );
}
