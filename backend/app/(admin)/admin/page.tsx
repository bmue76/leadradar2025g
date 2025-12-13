// backend/app/(admin)/admin/page.tsx
import Link from "next/link";

export default function AdminHomePage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          LeadRadar Admin-Bereich – wähle einen Bereich.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/forms"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300 hover:bg-slate-50"
        >
          <div className="text-sm font-semibold text-slate-900">Formulare</div>
          <div className="mt-1 text-xs text-slate-600">
            Formbuilder, Felder, Presets
          </div>
        </Link>

        <Link
          href="/admin/events"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300 hover:bg-slate-50"
        >
          <div className="text-sm font-semibold text-slate-900">Events</div>
          <div className="mt-1 text-xs text-slate-600">Event-Liste & Zuweisungen</div>
        </Link>

        <Link
          href="/admin/leads"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300 hover:bg-slate-50"
        >
          <div className="text-sm font-semibold text-slate-900">Leads</div>
          <div className="mt-1 text-xs text-slate-600">Übersicht & Filter</div>
        </Link>

        <Link
          href="/admin/api-keys"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300 hover:bg-slate-50"
        >
          <div className="text-sm font-semibold text-slate-900">API-Keys</div>
          <div className="mt-1 text-xs text-slate-600">Mobile Access / Keys</div>
        </Link>
      </div>
    </section>
  );
}
