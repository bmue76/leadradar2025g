"use client";

// backend/app/(admin)/admin/forms/FormsClient.tsx

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { FormDTO } from "@/lib/types/forms";
import type {
  FormPresetListItem,
  GetPresetsResponse,
  CreateFormFromPresetRequest,
  CreateFormFromPresetResponse,
} from "@/lib/types/form-presets";

type FormsClientProps = {
  initialForms: FormDTO[];
  initialError?: string | null;
};

function mapFormStatus(status: unknown): { label: string; className: string } {
  const s = String(status ?? "");

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
        label: s || "—",
        className: "border-slate-200 bg-slate-50 text-slate-600",
      };
  }
}

function groupByCategory(presets: FormPresetListItem[]) {
  const map = new Map<string, FormPresetListItem[]>();

  for (const p of presets) {
    const cat = (p.category ?? "").trim() || "Ohne Kategorie";
    const prev = map.get(cat) ?? [];
    prev.push(p);
    map.set(cat, prev);
  }

  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function FormsClient({ initialForms, initialError }: FormsClientProps) {
  const router = useRouter();

  const [forms] = useState<FormDTO[]>(initialForms ?? []);
  const [pageError] = useState<string | null>(initialError ?? null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [presets, setPresets] = useState<FormPresetListItem[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(null);

  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [newFormName, setNewFormName] = useState<string>("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Debug-Link falls Response ok, aber Navigation spinnt
  const [createdId, setCreatedId] = useState<number | null>(null);

  const hasForms = forms.length > 0;

  const grouped = useMemo(() => groupByCategory(presets), [presets]);

  async function loadPresets() {
    setLoadingPresets(true);
    setPresetsError(null);

    const res = await fetch("/api/admin/form-presets", {
      method: "GET",
      headers: { "x-user-id": "1" },
      cache: "no-store",
    });

    const data = await safeJson<GetPresetsResponse & { error?: string }>(res);

    if (!res.ok) {
      setPresets([]);
      setSelectedPresetId(null);
      setPresetsError(data?.error || "Presets konnten nicht geladen werden.");
      setLoadingPresets(false);
      return;
    }

    const items = Array.isArray(data?.presets) ? data!.presets : [];
    setPresets(items);

    if (items.length > 0) {
      setSelectedPresetId((prev) => prev ?? items[0].id);
    } else {
      setSelectedPresetId(null);
    }

    setLoadingPresets(false);
  }

  async function openDialog() {
    setIsDialogOpen(true);
    setCreateError(null);
    setNewFormName("");
    setCreatedId(null);
    await loadPresets();
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setCreateError(null);
  }

  async function handleCreateFromPreset() {
    if (!selectedPresetId) {
      setCreateError("Bitte wähle zuerst eine Vorlage aus.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    setCreatedId(null);

    const payload: CreateFormFromPresetRequest = {
      presetId: selectedPresetId,
    };

    const trimmed = newFormName.trim();
    if (trimmed.length > 0) payload.name = trimmed;

    const res = await fetch("/api/admin/forms/from-preset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "1",
      },
      body: JSON.stringify(payload),
    });

    const data = await safeJson<CreateFormFromPresetResponse & { error?: string }>(res);

    if (!res.ok) {
      setCreateError(data?.error || "Formular konnte nicht aus Vorlage erstellt werden.");
      setCreating(false);
      return;
    }

    const newId =
      (typeof data?.formId === "number" ? data.formId : null) ??
      (typeof data?.form?.id === "number" ? data.form.id : null) ??
      (typeof data?.id === "number" ? data.id : null);

    if (!newId) {
      setCreateError("Formular wurde erstellt, aber die neue ID fehlt in der Response.");
      setCreating(false);
      return;
    }

    setCreatedId(newId);

    // Navigieren
    closeDialog();
    router.push(`/admin/forms/${newId}`);
    router.refresh();

    // Hard fallback
    window.setTimeout(() => {
      const expected = `/admin/forms/${newId}`;
      if (window.location.pathname !== expected) {
        window.location.href = expected;
      }
    }, 300);

    setCreating(false);
  }

  return (
    <section className="space-y-4">
      {/* Header + Actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Formulare</h1>
          <p className="mt-2 text-sm text-slate-600">
            Übersicht aller vorhandenen Formulare. Klicke auf{" "}
            <span className="font-semibold">Details</span>, um ein Formular im Detail anzusehen.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void openDialog()}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            + aus Vorlage
          </button>
        </div>
      </div>

      {pageError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {pageError}
        </div>
      )}

      {!pageError && !hasForms && (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
          <p className="font-medium">Es sind noch keine Formulare vorhanden.</p>
          <p className="mt-1">
            Erstelle dein erstes Formular am schnellsten über{" "}
            <span className="font-semibold">+ aus Vorlage</span>.
          </p>
        </div>
      )}

      {!pageError && hasForms && (
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
                      <div className="font-medium">{form.name ?? `Formular #${form.id}`}</div>
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

      {/* Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 z-0 bg-black/30"
            onClick={closeDialog}
            role="button"
            tabIndex={-1}
            aria-label="Dialog schliessen"
          />
          <div
            className="relative z-10 w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div>
                <div className="text-lg font-semibold">Formular aus Vorlage erstellen</div>
                <div className="mt-1 text-sm text-slate-600">
                  Wähle eine Vorlage und erstelle daraus ein neues Formular (Standard: Entwurf).
                </div>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {presetsError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {presetsError}
                </div>
              )}

              {createError && !presetsError && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {createError}
                  {createdId && (
                    <div className="mt-2 text-xs">
                      Debug-Link:{" "}
                      <Link className="font-medium text-blue-700 hover:underline" href={`/admin/forms/${createdId}`}>
                        /admin/forms/{createdId}
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-800">
                  Neuer Formular-Name (optional)
                </label>
                <input
                  type="text"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder="z.B. Messe Leads 2026"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300"
                />
                <div className="mt-1 text-xs text-slate-500">
                  Wenn leer, verwenden wir den Vorlagen-Namen.
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-slate-800">Vorlage</div>
                  <button
                    type="button"
                    onClick={() => void loadPresets()}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    disabled={loadingPresets}
                  >
                    {loadingPresets ? "Lade…" : "Neu laden"}
                  </button>
                </div>

                {loadingPresets && (
                  <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Lade Vorlagen…
                  </div>
                )}

                {!loadingPresets && presets.length === 0 && !presetsError && (
                  <div className="mt-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
                    Noch keine Vorlagen vorhanden. Speichere zuerst ein bestehendes Formular als Vorlage.
                  </div>
                )}

                {!loadingPresets && presets.length > 0 && (
                  <div className="mt-2 max-h-72 overflow-auto rounded-md border border-slate-200">
                    {grouped.map(([cat, items]) => (
                      <div key={cat} className="border-b last:border-b-0">
                        <div className="bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {cat}
                        </div>
                        <div className="divide-y">
                          {items.map((p) => (
                            <label
                              key={p.id}
                              className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-slate-50"
                            >
                              <input
                                type="radio"
                                name="preset"
                                className="mt-1"
                                checked={selectedPresetId === p.id}
                                onChange={() => setSelectedPresetId(p.id)}
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900">{p.name}</div>
                                {p.description && (
                                  <div className="mt-0.5 text-xs text-slate-600">{p.description}</div>
                                )}
                                <div className="mt-0.5 text-[11px] text-slate-400">
                                  ID: {p.id} · Snapshot v{p.snapshotVersion} · Felder: {p.fieldCount}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                disabled={creating}
              >
                Abbrechen
              </button>

              <button
                type="button"
                onClick={() => void handleCreateFromPreset()}
                className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                disabled={creating || loadingPresets || presets.length === 0 || selectedPresetId === null}
                title={
                  presets.length === 0
                    ? "Keine Vorlagen vorhanden"
                    : selectedPresetId === null
                    ? "Bitte Vorlage auswählen"
                    : undefined
                }
              >
                {creating ? "Erstelle…" : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
