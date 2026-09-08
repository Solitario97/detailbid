import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-accent-dark px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">D</span>
          <span className="text-[17px] font-semibold text-white">DetailBid Admin</span>
        </Link>
        <div className="rounded-3xl bg-surface p-6">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}
