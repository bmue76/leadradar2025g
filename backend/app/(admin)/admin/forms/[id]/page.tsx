// backend/app/(admin)/admin/forms/[id]/page.tsx
import Link from "next/link";
import type { FormDTO, FormFieldDTO } from "@/lib/types/forms";

type FormDetail = FormDTO & {
  fields: FormFieldDTO[];
};

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

async function fetchForm(id: string): Promise<FormDetail | null> {
  console.log("[AdminFormDetail] fetchForm id:", id);

  const res = await fetch(
    `http://localhost:3000/api/admin/forms/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        "x-user-id": "1",
      },
      cache: "no-store",
    }
  );

  console.log("[AdminFormDetail] response status:", res.status);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    let errorBody = "";
    try {
      errorBody = await res.text();
    } catch {
      // ignore
    }
    console.error(
      "[AdminFormDetail] error response body:",
      errorBody || "<no body>"
    );
    throw new Error(`Failed to load form (${res.status})`);
  }

  const json = (await res.json()) as {
    form?: FormDTO;
    fields?: FormFieldDTO[];
  };

  console.log(
    "[AdminFormDetail] response json keys:",
    Object.keys(json)
  );

  if (!json.form) {
    return null;
  }

  return {
    ...json.form,
    fields: json.fields ?? [],
  };
}

type FormDetailPageProps = {
  // Next 16: params ist ein Promise und muss awaited werden
  params: Promise<{
    id: string;
  }>;
};

export default async function FormDetailPage({
  params,
}: FormDetailPageProps) {
  const { id } = await params;
  console.log("[AdminFormDetail] resolved id:", id);

  let form: FormDetail | null = null;

  try {
    form = await fetchForm(id);
  } catch (error) {
    console.error(error);
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Formular</h1>
        <p className="text-sm text-red-600">
          Fehler beim Laden des Formulars. Bitte versuche es erneut oder gehe
          zurück zur Formular-Übersicht.
        </p>
        <p className="text-sm">
          <Link href="/admin/forms" className="underline">
            Zurück zur Formular-Liste
          </Link>
        </p>
      </section>
    );
  }

  if (!form) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Formular</h1>
        <p className="text-sm text-slate-600">
          Das angeforderte Formular wurde nicht gefunden.
        </p>
        <p className="text-sm">
          <Link href="/admin/forms" className="underline">
            Zurück zur Formular-Liste
          </Link>
        </p>
      </section>
    );
  }

  const fields = form.fields ?? [];
  const status = mapFormStatus(form.status);

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{form.name}</h1>
            <p className="text-xs text-slate-500">
              Formular-ID: {form.id} · Tenant-ID: {form.tenantId}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${status.className}`}
          >
            {status.label.toUpperCase()}
          </span>
        </div>

        {form.description && (
          <p className="text-sm text-slate-600">{form.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/admin/forms" className="underline">
            ← Zurück zur Formular-Liste
          </Link>

          <a
            href={`/api/admin/forms/${form.id}/leads`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium hover:bg-slate-50"
          >
            Leads anzeigen (API)
          </a>
        </div>
      </header>

      {/* Felder */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Felder</h2>

        {!fields.length ? (
          <p className="text-sm text-slate-600">
            Für dieses Formular sind derzeit keine Felder definiert.
          </p>
        ) : (
          <div className="overflow-x-auto rounded border bg-white">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Typ</th>
                  <th className="px-3 py-2">Pflicht</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fields.map((field) => (
                  <tr key={field.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500">
                      {field.order ?? "-"}
                    </td>
                    <td className="px-3 py-2">{field.label}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {field.key ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {String(field.type)}
                    </td>
                    <td className="px-3 py-2">
                      {field.required ? "Ja" : "Nein"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Hinweis: Die Felder sind in diesem Teilprojekt nur lesbar. CRUD folgt
          in einem späteren Schritt.
        </p>
      </section>
    </section>
  );
}
