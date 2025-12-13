import Link from "next/link";
import { headers } from "next/headers";
import type {
  GetPresetResponse,
  FormPresetFieldSummary,
  FormPresetRevisionListItemDTO,
} from "@/lib/types/form-presets";
import PresetDetailActions from "./PresetDetailActions";

export const dynamic = "force-dynamic";

type HeadersType = Awaited<ReturnType<typeof headers>>;
type SearchParams = Record<string, string | string[] | undefined>;

// defensiv: Next kann params/searchParams manchmal als Promise liefern (Turbopack/Next 16 Edge-Cases)
type MaybePromise<T> = T | Promise<T>;

function firstString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

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

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function snapshotFieldCount(snapshot: unknown): number {
  if (!isPlainObject(snapshot)) return 0;
  const fields = (snapshot as any).fields;
  return Array.isArray(fields) ? fields.length : 0;
}

function snapshotFieldsSummary(snapshot: unknown): FormPresetFieldSummary[] {
  if (!isPlainObject(snapshot)) return [];
  const fields = (snapshot as any).fields;
  if (!Array.isArray(fields)) return [];

  return fields.map((f: any, idx: number) => ({
    order: typeof f?.order === "number" ? f.order : idx + 1,
    label: typeof f?.label === "string" ? f.label : "",
    key: typeof f?.key === "string" ? f.key : "",
    type: typeof f?.type === "string" ? f.type : "",
    required: Boolean(f?.required),
    active: f?.isActive === undefined ? true : Boolean(f?.isActive),
  }));
}

function snapshotHasKey(snapshot: unknown, key: string): boolean {
  if (!isPlainObject(snapshot)) return false;

  if (key in snapshot) return true;

  const form = (snapshot as any).form;
  if (isPlainObject(form)) {
    if (key in form) return true;

    const config = (form as any).config;
    if (isPlainObject(config) && key in config) return true;
  }

  const configTop = (snapshot as any).config;
  if (isPlainObject(configTop) && key in configTop) return true;

  return false;
}

// Workaround: ohne optional chaining + ?? (Turbopack sourcemap zickt hier manchmal)
function getQueryParam(sp: SearchParams | null | undefined, key: string) {
  if (!sp) return undefined;
  return (sp as any)[key] as string | string[] | undefined;
}

export default async function AdminPresetDetailPage({
  params,
  searchParams,
}: {
  params?: MaybePromise<{ id: string }>;
  searchParams?: MaybePromise<SearchParams>;
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
        <p className="mt-2 text-sm text-red-600">Fehler beim Laden der Vorlage ({res.status})</p>
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

  const sp = (await Promise.resolve(searchParams as any)) as SearchParams | undefined;

  // kein ?? / ?. => stabilere Sourcemaps in Next 16 Turbopack
  const vParam = getQueryParam(sp, "v");
  const versionParam = getQueryParam(sp, "version");
  const requestedVersionRaw = firstString(vParam !== undefined ? vParam : versionParam);
  const requestedVersion = requestedVersionRaw ? Number.parseInt(requestedVersionRaw, 10) : null;

  // Default: Current Snapshot
  let viewKind: "current" | "revision" = "current";
  let viewVersion = preset.snapshotVersion;
  let viewSnapshot: unknown = preset.snapshot;
  let viewFields: FormPresetFieldSummary[] = preset.snapshotSummary?.fields ?? [];
  let viewFieldCount: number = preset.fieldCount;
  let viewHasTheme: boolean = preset.snapshotInfo?.hasTheme ?? false;
  let viewHasContactSlots: boolean = preset.snapshotInfo?.hasContactSlots ?? false;
  let revisionCreatedAtIso: string | null = null;
  let revisionLoadError: string | null = null;

  // If user requests an older version -> load revision snapshot
  if (
    requestedVersion &&
    Number.isFinite(requestedVersion) &&
    requestedVersion > 0 &&
    requestedVersion !== preset.snapshotVersion
  ) {
    const revRes = await fetch(
      `${baseUrl}/api/admin/form-presets/${id}/revisions/${requestedVersion}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "x-user-id": userId,
          ...(tenantId ? { "x-tenant-id": tenantId } : {}),
        },
      },
    );

    if (revRes.ok) {
      const revData = (await revRes.json()) as any;
      const rev = revData?.revision;

      if (rev?.snapshot) {
        viewKind = "revision";
        viewVersion = requestedVersion;
        viewSnapshot = rev.snapshot;
        revisionCreatedAtIso = typeof rev.createdAt === "string" ? rev.createdAt : null;

        // compute summary locally (History endpoint is raw snapshot only)
        viewFields = snapshotFieldsSummary(viewSnapshot);
        viewFieldCount = snapshotFieldCount(viewSnapshot);
        viewHasTheme = snapshotHasKey(viewSnapshot, "theme");
        viewHasContactSlots = snapshotHasKey(viewSnapshot, "contactSlots");
      }
    } else {
      const txt = await revRes.text().catch(() => "");
      revisionLoadError = `Revision v${requestedVersion} konnte nicht geladen werden (${revRes.status}). ${txt}`;
    }
  }

  const revisions: FormPresetRevisionListItemDTO[] = Array.isArray(data.revisions) ? data.revisions : [];

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
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
              Kategorie: {preset.category}
            </span>

            {viewKind === "current" ? (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                Current v{preset.snapshotVersion}
              </span>
            ) : (
              <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                Ansicht: Revision v{viewVersion}
              </span>
            )}

            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">Felder: {viewFieldCount}</span>
          </div>

          {preset.description ? (
            <p className="mt-3 max-w-3xl text-sm text-gray-700">{preset.description}</p>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Keine Beschreibung.</p>
          )}
        </div>

        <PresetDetailActions
          presetId={preset.id}
          viewKind={viewKind}
          viewVersion={viewVersion}
          currentVersion={preset.snapshotVersion}
          auth={{
            userId,
            tenantId: tenantId ?? null,
          }}
        />
      </div>

      {revisionLoadError ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {revisionLoadError}
        </div>
      ) : null}

      {/* Versionen */}
      <div className="mt-6 overflow-hidden rounded border">
        <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
          <div>
            <div className="text-sm font-medium">Versionen</div>
            <div className="text-xs text-gray-600">Aktuell + Historie (klickbar)</div>
          </div>

          {viewKind === "revision" ? (
            <Link
              href={`/admin/presets/${preset.id}`}
              className="rounded border bg-white px-3 py-2 text-xs hover:bg-gray-50"
              title="Zur aktuellen Version wechseln"
            >
              Zur aktuellen Version
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 px-4 py-4">
          <Link
            href={`/admin/presets/${preset.id}`}
            className={`rounded border px-3 py-2 text-xs hover:bg-gray-50 ${
              viewKind === "current" ? "bg-gray-100 font-medium" : "bg-white"
            }`}
            title="Aktuelle Version"
          >
            Current v{preset.snapshotVersion}
          </Link>

          {revisions.length ? (
            revisions.map((r) => (
              <Link
                key={r.id}
                href={`/admin/presets/${preset.id}?v=${r.version}`}
                className={`rounded border px-3 py-2 text-xs hover:bg-gray-50 ${
                  viewKind === "revision" && viewVersion === r.version
                    ? "bg-amber-50 font-medium text-amber-800"
                    : "bg-white"
                }`}
                title={`Revision v${r.version} anzeigen`}
              >
                v{r.version}{" "}
                <span className="text-gray-500">
                  · {formatDateTime(r.createdAt)}
                  {r.createdByUserId !== undefined && r.createdByUserId !== null
                    ? ` · erstellt von ${r.createdByUserId}`
                    : ""}
                </span>
              </Link>
            ))
          ) : (
            <span className="text-xs text-gray-500">Noch keine Historie vorhanden.</span>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
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
            <div>theme enthalten: {viewHasTheme ? "Ja" : "Nein"}</div>
            <div>contactSlots enthalten: {viewHasContactSlots ? "Ja" : "Nein"}</div>
          </div>
        </div>

        <div className="rounded border p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Revision</div>
          <div className="mt-1 text-sm">
            {viewKind === "revision" ? (
              <>
                <div>v{viewVersion}</div>
                <div className="text-gray-600">
                  {revisionCreatedAtIso ? formatDateTime(revisionCreatedAtIso) : "—"}
                </div>
              </>
            ) : (
              <div className="text-gray-600">Aktuell</div>
            )}
          </div>
        </div>
      </div>

      {/* Feldliste */}
      <div className="mt-6 overflow-hidden rounded border">
        <div className="bg-gray-50 px-4 py-3">
          <div className="text-sm font-medium">Feldliste</div>
          <div className="text-xs text-gray-600">Reihenfolge, Label, Key, Typ, Required, Active</div>
        </div>

        {viewFields.length === 0 ? (
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
              {viewFields.map((f, idx) => (
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

      {/* Raw JSON */}
      <details className="mt-6 rounded border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Snapshot (Raw JSON) anzeigen {viewKind === "revision" ? `(Revision v${viewVersion})` : "(Current)"}
        </summary>
        <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs">
          {JSON.stringify(viewSnapshot, null, 2)}
        </pre>
      </details>
    </div>
  );
}
