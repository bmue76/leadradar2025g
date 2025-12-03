// backend/app/(admin)/admin/page.tsx
export default function AdminDashboardPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin-Dashboard</h1>

      <p className="text-sm text-slate-600">
        Willkommen im LeadRadar Admin-Bereich. Hier verwaltest du Formulare
        und siehst erfasste Leads ein.
      </p>

      <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
        <li>
          <strong>Formulare:</strong> Übersicht aller erstellten Formulare
          unter <code>/admin/forms</code>.
        </li>
        <li>
          <strong>Leads:</strong> Später eigene Ansichten für Leads pro
          Formular.
        </li>
      </ul>

      <p className="text-sm">
        Starte mit der{" "}
        <a href="/admin/forms" className="underline">
          Formular-Liste
        </a>
        .
      </p>
    </section>
  );
}
