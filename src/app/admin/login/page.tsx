import Link from "next/link";
import Image from "next/image";
import { AdminLoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-accent-dark px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Image src="/autopick-logo.png" alt="AutoPick" width={96} height={96} className="rounded-2xl object-contain" />
        </Link>
        <div className="rounded-3xl bg-surface p-6">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
