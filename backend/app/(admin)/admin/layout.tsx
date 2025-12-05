// app/(admin)/admin/layout.tsx
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AdminSidebar } from './AdminSidebar';

export const metadata: Metadata = {
  title: 'LeadRadar Admin',
};

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* 
        Flex-Layout:
        - Mobile: flex-col (Sidebar oben, Content darunter)
        - Desktop (md+): flex-row (Sidebar links, Content rechts)
      */}
      <div className="flex min-h-screen md:h-screen flex-col md:flex-row">
        {/* Sidebar mit Navigation */}
        <AdminSidebar />

        {/* Haupt-Content – eigener Scroll-Container */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
