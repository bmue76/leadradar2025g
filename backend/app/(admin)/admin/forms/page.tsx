// backend/app/(admin)/admin/forms/page.tsx
import Link from "next/link";
import type { FormDTO } from "@/lib/types/forms";

function mapFormStatus(status: unknown): { label: string; className: string } {
  const s = String(status);

  switch (s) {
    case "ACTIVE":
      return {
        label: "Aktiv",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "DRAFT":
      return {
        label: "Entwurf",
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    case "ARCHIVED":
      return {
        label: "Archiviert",
        className: "border-slate-300 bg-slate-100 text-slate-600",
      };
    default:
      return {
        label: s,
        className: "border-slate-200 bg-slate-50 text-slate-600",
      };
  }
}

async function fetchForms(): Promise<FormDTO[]> {
  const res = await fetch("http://localhost:3000/api/admin/forms", {
    method: "GET",
    headers: {
      // Fake-Auth: Demo-User aus Seed
      "x-user-id": "1",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load forms (${res.status})`);
  }

  const json = await res.json();

  // Verschiedene typische Antwort-Formate abfangen
  if (Array.isArray(json)) {
    return json as FormDTO[];
  }

  if (Array.isArray((json as any).items)) {
    return (json as any).items as FormDTO[];
  }

  if (Array.isArray((json as any).data)) {
    return (json as any).data as FormDTO[];
  }

  return [];
}

export default async function AdminFormsPage() {
  let forms: FormDTO[] = [];

  try {
    forms = await fetchForms();
  } catch (error) {
    console.error(error);
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Formulare</h1>
        <p className="text-sm text-red-600">
          Fehler beim Laden der Formulare. Bitte prüfe den Dev-Server und die
          Admin-API <code>/api/admin/forms</code>.
        </p>
      </section>
    );
  }

  if (!forms.length) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Formulare</h1>
        <p className="text-sm text-slate-600">
          Es sind noch keine Formulare vorhanden.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Formulare</h1>
      <p className="text-sm text-slate-600">
        Übersicht aller vorhandenen Formulare. Klicke auf{" "}
        <span className="font-semibold">Details</span>, um ein Formular im
        Detail anzusehen.
      </p>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Titel</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {forms.map((form) => {
              const status = mapFormStatus(form.status);

              return (
                <tr key={form.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-500">{form.id}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {form.name ?? `Formular #${form.id}`}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/forms/${form.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
