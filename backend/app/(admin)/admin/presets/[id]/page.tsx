import Link from "next/link";
import { headers } from "next/headers";
import type { GetPresetResponse } from "@/lib/types/form-presets";
import PresetDetailActions from "./PresetDetailActions";

export const dynamic = "force-dynamic";

type HeadersType = Awaited<ReturnType<typeof headers>>;

function buildBaseUrl(h: HeadersType) {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminPresetDetailPage({
  params,
}: {
  // Next 16: params kann Promise sein
  params?: { id: string } | Promise<{ id: string }>;
}) {
  const h = await headers();
  const p = await Promise.resolve(params as any);

  const rawId = p?.id;
  const id = Number.parseInt(String(rawId), 10);

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Vorlage</h1>
        <p className="mt-2 text-sm text-red-600">Ungültige Preset-ID.</p>
        <div className="mt-4">
          <Link className="rounded border px-3 py-2 text-sm hover:bg-gray-50" href="/admin/presets">
            Zurück zur Library
          </Link>
        </div>
      </div>
    );
  }

  const baseUrl = buildBaseUrl(h);

  // Dev-freundlicher Fallback
  const userId = h.get("x-user-id") ?? "1";
  const tenantId = h.get("x-tenant-id");

  const res = await fetch(`${baseUrl}/api/admin/form-presets/${id}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      "x-user-id": userId,
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Vorlage</h1>
        <p className="mt-2 text-sm text-red-600">
          Fehler beim Laden der Vorlage ({res.status})
        </p>
        <pre className="mt-3 whitespace-pre-wrap rounded border p-3 text-xs">{text}</pre>
        <div className="mt-4">
          <Link className="rounded border px-3 py-2 text-sm hover:bg-gray-50" href="/admin/presets">
            Zurück zur Library
          </Link>
        </div>
      </div>
    );
  }

  const data = (await res.json()) as GetPresetResponse;
  const preset = data.preset;

  const fields = preset.snapshotSummary?.fields ?? [];
  const hasTheme = preset.snapshotInfo?.hasTheme ?? false;
  const hasContactSlots = preset.snapshotInfo?.hasContactSlots ?? false;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/presets" className="text-sm text-gray-600 hover:underline">
              Vorlagen
            </Link>
            <span className="text-sm text-gray-400">/</span>
            <span className="text-sm text-gray-600">Preview</span>
          </div>

          <h1 className="mt-2 text-xl font-semibold">{preset.name}</h1>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">Kategorie: {preset.category}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">Snapshot v{preset.snapshotVersion}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">Felder: {preset.fieldCount}</span>
          </div>

          {preset.description ? (
            <p className="mt-3 max-w-3xl text-sm text-gray-700">{preset.description}</p>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Keine Beschreibung.</p>
          )}
        </div>

        <PresetDetailActions
          presetId={preset.id}
          auth={{
            userId,
            tenantId: tenantId ?? null,
          }}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded border p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Erstellt</div>
          <div className="mt-1 text-sm">{formatDateTime(preset.createdAt)}</div>
        </div>

        <div className="rounded border p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Zuletzt geändert</div>
          <div className="mt-1 text-sm">{formatDateTime(preset.updatedAt)}</div>
        </div>

        <div className="rounded border p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Snapshot Info</div>
          <div className="mt-1 text-sm">
            <div>theme enthalten: {hasTheme ? "Ja" : "Nein"}</div>
            <div>contactSlots enthalten: {hasContactSlots ? "Ja" : "Nein"}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded border">
        <div className="bg-gray-50 px-4 py-3">
          <div className="text-sm font-medium">Feldliste</div>
          <div className="text-xs text-gray-600">
            Reihenfolge, Label, Key, Typ, Required, Active
          </div>
        </div>

        {fields.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-600">Keine Felder im Snapshot gefunden.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-white">
              <tr className="border-t text-xs uppercase tracking-wide text-gray-600">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Required</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, idx) => (
                <tr key={`${f.key}-${idx}`} className="border-t">
                  <td className="px-4 py-3">{f.order}</td>
                  <td className="px-4 py-3">{f.label}</td>
                  <td className="px-4 py-3 font-mono text-xs">{f.key}</td>
                  <td className="px-4 py-3">{f.type}</td>
                  <td className="px-4 py-3">{f.required ? "Ja" : "Nein"}</td>
                  <td className="px-4 py-3">{f.active ? "Ja" : "Nein"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <details className="mt-6 rounded border p-4">
        <summary className="cursor-pointer text-sm font-medium">Snapshot (Raw JSON) anzeigen</summary>
        <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs">
          {JSON.stringify(preset.snapshot, null, 2)}
        </pre>
      </details>
    </div>
  );
}
