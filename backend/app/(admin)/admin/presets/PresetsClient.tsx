"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  FormPresetListItem,
  PresetCategoryFacet,
  ImportPresetResponse,
} from "@/lib/types/form-presets";
import { PRESET_IMPORT_MAX_BYTES } from "@/lib/validation/form-presets";

type Props = {
  presets: FormPresetListItem[];
  categories: PresetCategoryFacet[];
  currentQ: string;
  currentCategory: string;
  auth: {
    userId: string;
    tenantId: string | null;
  };
};

type Notice = { kind: "success" | "error"; message: string };

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatBytes(n: number) {
  const kb = 1024;
  const mb = 1024 * 1024;
  if (n >= mb) return `${(n / mb).toFixed(2)} MB`;
  if (n >= kb) return `${(n / kb).toFixed(1)} KB`;
  return `${n} B`;
}

async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}

function extractErrorMessageFromApi(text: string) {
  // jsonError shape: { error, code, details? }
  try {
    const j = JSON.parse(text);
    if (j && typeof j.error === "string") {
      const code = typeof j.code === "string" ? j.code : null;
      const details = j.details;

      let msg = j.error;
      if (code) msg = `${code}: ${msg}`;

      // show a short issues preview if present
      const issues = details?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        const head = issues.slice(0, 4).map((i: any) => {
          const path = typeof i.path === "string" ? i.path : "";
          const m = typeof i.message === "string" ? i.message : "";
          return path ? `${path}: ${m}` : m;
        });
        msg += `\n- ${head.join("\n- ")}`;
        if (issues.length > 4) msg += `\n… (+${issues.length - 4} weitere)`;
      }

      return msg;
    }
  } catch {
    // ignore
  }

  return text;
}

export default function PresetsClient({
  presets,
  categories,
  currentQ,
  currentCategory,
  auth,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [qInput, setQInput] = useState(currentQ);
  const [category, setCategory] = useState(currentCategory);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [localPresets, setLocalPresets] = useState<FormPresetListItem[]>(presets);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportPresetResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [notice, setNotice] = useState<Notice | null>(null);

  const headers = useMemo(() => {
    return {
      "x-user-id": auth.userId,
      ...(auth.tenantId ? { "x-tenant-id": auth.tenantId } : {}),
    } as Record<string, string>;
  }, [auth.userId, auth.tenantId]);

  useEffect(() => {
    setQInput(currentQ);
  }, [currentQ]);

  useEffect(() => {
    setCategory(currentCategory);
  }, [currentCategory]);

  useEffect(() => {
    setLocalPresets(presets);
  }, [presets]);

  const categoryOptions = useMemo(() => {
    const opts = categories ?? [];
    return [{ category: "", count: opts.reduce((a, b) => a + (b.count ?? 0), 0) }, ...opts];
  }, [categories]);

  function buildUrl(nextQ: string, nextCategory: string) {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (nextQ?.trim()) next.set("q", nextQ.trim());
    else next.delete("q");

    if (nextCategory?.trim()) next.set("category", nextCategory.trim());
    else next.delete("category");

    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  // Debounce Search
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(buildUrl(qInput, category));
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  function onCategoryChange(v: string) {
    setCategory(v);
    router.replace(buildUrl(qInput, v));
  }

  function clearFilters() {
    setQInput("");
    setCategory("");
    router.replace(pathname);
  }

  async function deletePreset(id: number) {
    const ok = window.confirm("Willst du diese Vorlage wirklich löschen?");
    if (!ok) return;

    setDeletingId(id);

    // Optimistic
    setLocalPresets((prev) => prev.filter((p) => p.id !== id));

    try {
      const res = await fetch(`/api/admin/form-presets/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        window.alert(`Löschen fehlgeschlagen (${res.status}).\n${text}`);
        router.refresh(); // zurück-syncen
        return;
      }

      router.refresh();
    } catch (e: any) {
      window.alert(`Löschen fehlgeschlagen.\n${e?.message ?? String(e)}`);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  function openImport() {
    setNotice(null);
    setImportError(null);
    setImportResult(null);
    setImportFile(null);
    setImportOpen(true);

    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function onImportSubmit() {
    setImportError(null);
    setImportResult(null);
    setNotice(null);

    if (!importFile) {
      setImportError("Bitte eine .json Datei auswählen.");
      return;
    }

    if (importFile.size > PRESET_IMPORT_MAX_BYTES) {
      setImportError(
        `Datei ist zu gross (${formatBytes(importFile.size)}). Max erlaubt: ${formatBytes(PRESET_IMPORT_MAX_BYTES)}.`,
      );
      return;
    }

    setImportBusy(true);

    try {
      const raw = await readFileAsText(importFile);

      // basic sanity (optional)
      try {
        JSON.parse(raw);
      } catch {
        setImportError("Ungültiges JSON (konnte nicht geparst werden).");
        return;
      }

      const res = await fetch("/api/admin/form-presets/import", {
        method: "POST",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        body: raw,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setImportError(extractErrorMessageFromApi(txt) || `Import fehlgeschlagen (${res.status}).`);
        return;
      }

      const data = (await res.json().catch(() => null)) as ImportPresetResponse | null;
      if (!data || typeof data.presetId !== "number") {
        setImportError("Import: Unerwartete Response.");
        return;
      }

      setImportResult(data);

      setNotice({
        kind: "success",
        message: `Import erfolgreich: "${data.name}" (ID #${data.presetId})`,
      });

      // optional: liste neu laden
      router.refresh();
    } catch (e: any) {
      setImportError(e?.message ?? String(e));
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Vorlagen</h1>
          <p className="mt-1 text-sm text-gray-600">
            Verwalte gespeicherte Formular-Vorlagen (Presets). Du erstellst eine Vorlage, indem du ein bestehendes
            Formular als Vorlage speicherst.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openImport}
            className="inline-flex items-center justify-center rounded border px-3 py-2 text-sm hover:bg-gray-50"
            title="Preset JSON importieren (erzeugt immer eine neue Vorlage)"
          >
            Import JSON
          </button>

          <Link
            href="/admin/forms"
            className="inline-flex items-center justify-center rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Preset erstellen
          </Link>
        </div>
      </div>

      {notice ? (
        <div
          className={`mt-4 rounded border px-3 py-2 text-sm ${
            notice.kind === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
          {importResult ? (
            <>
              {" "}
              <Link className="underline" href={`/admin/presets/${importResult.presetId}`}>
                Preset öffnen
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Suche: Name oder Kategorie…"
            className="w-full rounded border px-3 py-2 text-sm md:max-w-md"
          />

          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm md:max-w-xs"
          >
            {categoryOptions.map((c) => (
              <option key={c.category || "__all__"} value={c.category}>
                {c.category ? `${c.category} (${c.count})` : `Alle Kategorien (${c.count})`}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="w-full rounded border px-3 py-2 text-sm hover:bg-gray-50 md:w-auto"
          >
            Filter zurücksetzen
          </button>
        </div>

        <div className="text-sm text-gray-600">
          {localPresets.length} Vorlage{localPresets.length === 1 ? "" : "n"}
        </div>
      </div>

      {localPresets.length === 0 ? (
        <div className="mt-8 rounded border p-6">
          <div className="text-base font-medium">Noch keine Vorlagen vorhanden</div>
          <p className="mt-2 text-sm text-gray-600">
            Gehe zu <span className="font-medium">Formulare</span>, öffne ein Formular und speichere es als Vorlage
            (Preset). Danach erscheint es hier in der Library.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/forms"
              className="inline-flex items-center justify-center rounded bg-black px-3 py-2 text-sm text-white"
            >
              Zu den Formularen
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr className="text-xs uppercase tracking-wide text-gray-600">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Kategorie</th>
                <th className="px-4 py-3">Felder</th>
                <th className="px-4 py-3">Erstellt</th>
                <th className="px-4 py-3">Aktualisiert</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {localPresets.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link href={`/admin/presets/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    {p.description ? (
                      <div className="mt-0.5 line-clamp-2 text-xs text-gray-600">{p.description}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3">{p.fieldCount}</td>
                  <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/admin/presets/${p.id}`}
                        className="rounded border px-2.5 py-1.5 text-xs hover:bg-gray-50"
                      >
                        Preview
                      </Link>

                      <button
                        type="button"
                        disabled={deletingId === p.id}
                        onClick={() => deletePreset(p.id)}
                        className="rounded border px-2.5 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-60"
                      >
                        {deletingId === p.id ? "Lösche…" : "Löschen"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t bg-gray-50 px-4 py-3 text-xs text-gray-600">
            Tipp: “Preview” führt zur Detailseite. Import erzeugt immer eine neue Vorlage (kein Overwrite).
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded border bg-white p-4 shadow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Preset importieren (JSON)</div>
                <div className="mt-1 text-sm text-gray-600">
                  Du lädst ein Export-JSON hoch. Import erstellt immer ein neues Preset im aktuellen Tenant.
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Limit: {formatBytes(PRESET_IMPORT_MAX_BYTES)} · Revisions (falls enthalten) max. 50
                </div>
              </div>

              <button
                type="button"
                className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
                onClick={() => {
                  if (!importBusy) setImportOpen(false);
                }}
                disabled={importBusy}
                aria-label="Schliessen"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">JSON Datei</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="mt-2 w-full rounded border px-3 py-2 text-sm"
                onChange={(e) => {
                  setImportError(null);
                  setImportResult(null);
                  const f = e.target.files?.[0] ?? null;
                  setImportFile(f);
                }}
                disabled={importBusy}
              />

              {importFile ? (
                <div className="mt-2 text-xs text-gray-600">
                  Ausgewählt: <span className="font-medium">{importFile.name}</span> · {formatBytes(importFile.size)}
                </div>
              ) : null}

              {importError ? (
                <pre className="mt-3 whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {importError}
                </pre>
              ) : null}

              {importResult ? (
                <div className="mt-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  <div className="font-medium">Import erfolgreich</div>
                  <div className="mt-1 text-sm">
                    {importResult.name} · snapshotVersion v{importResult.snapshotVersion} · Revisions importiert:{" "}
                    {importResult.importedRevisionsCount}
                  </div>
                  <div className="mt-2">
                    <Link className="underline" href={`/admin/presets/${importResult.presetId}`}>
                      Preset öffnen
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                onClick={() => setImportOpen(false)}
                disabled={importBusy}
              >
                Schliessen
              </button>

              <button
                type="button"
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                onClick={onImportSubmit}
                disabled={importBusy || !importFile}
              >
                {importBusy ? "Importiere…" : "Import starten"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
