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

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function fetchForms(): Promise<FormDTO[]> {
  const res = await fetch("http://localhost:3000/api/admin/forms", {
    method: "GET",
    headers: {
      "x-user-id": "1",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load forms (${res.status})`);
  }

  const json: unknown = await res.json();

  if (Array.isArray(json)) return json as FormDTO[];

  if (isPlainObject(json) && Array.isArray(json.items)) {
    return json.items as FormDTO[];
  }

  if (isPlainObject(json) && Array.isArray(json.data)) {
    return json.data as FormDTO[];
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
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Formulare</h1>
          <Link
            href="/admin/forms/new"
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Aus Vorlage erstellen
          </Link>
        </div>

        <p className="text-sm text-red-600">
          Fehler beim Laden der Formulare. Bitte prüfe den Dev-Server und die
          Admin-API <code>/api/admin/forms</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Formulare</h1>
          <p className="mt-1 text-sm text-slate-600">
            Übersicht aller vorhandenen Formulare.
          </p>
        </div>

        <Link
          href="/admin/forms/new"
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Aus Vorlage erstellen
        </Link>
      </div>

      {!forms.length ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          <p className="font-medium">Es sind noch keine Formulare vorhanden.</p>
          <p className="mt-1 text-xs text-slate-500">
            Tipp: Erstelle zuerst ein Formular (Seed/Demo) und speichere es als Vorlage.
          </p>
        </div>
      ) : (
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
      )}
    </section>
  );
}
