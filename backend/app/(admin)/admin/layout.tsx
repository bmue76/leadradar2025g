// backend/app/(admin)/admin/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-500">
              LeadRadar
            </span>
            <span className="text-sm text-slate-400">Admin</span>
          </div>

          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/admin/forms" className="hover:underline">
              Formulare
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex-1 w-full max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
