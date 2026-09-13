import Link from "next/link";
import Image from "next/image";
import { CompanyLoginForm } from "@/components/company/auth-forms";

export default function CompanyLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Image src="/autopick-logo.png" alt="AutoPick" width={200} height={200} className="rounded-2xl object-contain" />
        </Link>
        <h1 className="mb-6 text-center text-xl font-semibold tracking-tight text-ink">Кабинет детейлинг-компании</h1>
        <CompanyLoginForm />
      </div>
    </main>
  );
}
