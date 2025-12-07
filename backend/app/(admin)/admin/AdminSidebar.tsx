// app/(admin)/admin/AdminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    isActive: (pathname) => pathname === '/admin',
  },
  {
    label: 'Formulare',
    href: '/admin/forms',
    isActive: (pathname) =>
      pathname === '/admin/forms' || pathname.startsWith('/admin/forms/'),
  },
  {
    label: 'Events',
    href: '/admin/events',
    isActive: (pathname) =>
      pathname === '/admin/events' || pathname.startsWith('/admin/events/'),
  },
  {
    label: 'Leads',
    href: '/admin/leads',
    isActive: (pathname) =>
      pathname === '/admin/leads' || pathname.startsWith('/admin/leads/'),
  },
  {
    label: 'Exporte',
    href: '/admin/exports',
    isActive: (pathname) =>
      pathname === '/admin/exports' || pathname.startsWith('/admin/exports/'),
  },
  {
    label: 'Einstellungen',
    href: '/admin/settings',
    isActive: (pathname) =>
      pathname === '/admin/settings' ||
      pathname.startsWith('/admin/settings/'),
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="
        bg-white
        border-b md:border-b-0 md:border-r border-slate-200
        w-full md:w-64
        px-4 py-4 md:py-6
        flex-shrink-0
        flex flex-col
        md:h-screen md:overflow-y-auto
      "
    >
      {/* Logo / Titel */}
      <div className="mb-4 md:mb-6">
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          LeadRadar
        </span>
        <span className="block text-lg font-semibold text-slate-800">
          Admin
        </span>
      </div>

      {/* Navigation-Label (auf Desktop sichtbar, auf Mobile dezenter) */}
      <div className="mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Navigation
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 mt-1 text-sm">
        {navItems.map((item) => {
          const active = item.isActive(pathname ?? '');
          const baseClasses =
            'flex items-center rounded-md px-3 py-2 transition-colors';
          const inactiveClasses =
            'text-slate-600 hover:bg-slate-50 hover:text-slate-900';
          const activeClasses =
            'bg-slate-100 text-slate-900 font-semibold border border-slate-200';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${baseClasses} ${
                active ? activeClasses : inactiveClasses
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Optionaler Footer / Platzhalter */}
      <div className="mt-4 md:mt-6 text-xs text-slate-400">
        <div>v0.1 · Layout-Shell</div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
