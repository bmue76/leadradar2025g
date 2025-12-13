"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type FormOption = {
  id: number;
  name: string;
};

function normalizeForms(data: any): FormOption[] {
  // akzeptiere: { forms: [...] } oder [...] oder { items: [...] }
  const arr =
    (data && Array.isArray(data.forms) && data.forms) ||
    (Array.isArray(data) && data) ||
    (data && Array.isArray(data.items) && data.items) ||
    [];

  return arr
    .map((x: any) => ({
      id: Number(x?.id),
      name: typeof x?.name === "string" ? x.name : typeof x?.title === "string" ? x.title : "",
    }))
    .filter((x: FormOption) => Number.isFinite(x.id) && x.id > 0 && x.name.trim().length > 0)
    .sort((a: FormOption, b: FormOption) => a.name.localeCompare(b.name));
}

async function fetchFormsWithFallback(
  headers: Record<string, string>,
): Promise<{ ok: true; forms: FormOption[] } | { ok: false; error: string }> {
  // 1) bevorzugt: limit (falls euer Endpoint das kann)
  // 2) fallback: ohne Query (wenn euer Endpoint strict validiert)
  const candidates = ["/api/admin/forms?limit=200", "/api/admin/forms"];

  let lastError = "Unbekannter Fehler";
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "GET", headers });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        const options = normalizeForms(data);
        return { ok: true, forms: options };
      }

      const txt = await res.text().catch(() => "");
      lastError = `Formulare konnten nicht geladen werden (${res.status}) via ${url}. ${txt}`;

      // wenn der Server 400 liefert, lohnt sich der Fallback sicher
      // bei anderen Status (401/403/500) ebenfalls – aber wir versuchen sowieso der Reihe nach
    } catch (e: any) {
      lastError = e?.message ?? String(e);
    }
  }

  return { ok: false, error: lastError };
}

export default function PresetDetailActions({
  presetId,
  auth,
}: {
  presetId: number;
  auth: { userId: string; tenantId: string | null };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Update Modal
  const [updateOpen, setUpdateOpen] = useState(false);
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [forms, setForms] = useState<FormOption[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );

  const headers = useMemo(() => {
    return {
      "x-user-id": auth.userId,
      ...(auth.tenantId ? { "x-tenant-id": auth.tenantId } : {}),
    } as Record<string, string>;
  }, [auth.userId, auth.tenantId]);

  useEffect(() => {
    if (!updateOpen) return;

    // jedes Öffnen: forms einmalig laden (oder wenn leer)
    if (forms.length > 0) return;

    (async () => {
      setFormsLoading(true);
      setFormsError(null);

      const result = await fetchFormsWithFallback(headers);

      if (!result.ok) {
        setFormsError(result.error);
        setFormsLoading(false);
        return;
      }

      setForms(result.forms);
      setSelectedFormId(result.forms[0]?.id ?? null);
      setFormsLoading(false);
    })();
  }, [updateOpen, forms.length, headers]);

  async function onDelete() {
    const ok = window.confirm("Willst du diese Vorlage wirklich löschen?");
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/form-presets/${presetId}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        window.alert(`Löschen fehlgeschlagen (${res.status}).\n${text}`);
        return;
      }

      router.push("/admin/presets");
      router.refresh();
    } catch (e: any) {
      window.alert(`Löschen fehlgeschlagen.\n${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function onUpdatePreset() {
    if (!selectedFormId) {
      setNotice({ kind: "error", message: "Bitte ein Formular auswählen." });
      return;
    }

    setUpdateBusy(true);
    setNotice(null);

    try {
      const res = await fetch(`/api/admin/form-presets/${presetId}/update`, {
        method: "POST",
        headers: {
          ...headers,
          "content-type": "application/json",
        },
        body: JSON.stringify({ formId: selectedFormId }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setNotice({
          kind: "error",
          message: `Aktualisieren fehlgeschlagen (${res.status}). ${txt}`,
        });
        return;
      }

      const data = await res.json().catch(() => null);
      const newVersion = data?.preset?.snapshotVersion;

      setUpdateOpen(false);
      setNotice({
        kind: "success",
        message:
          typeof newVersion === "number"
            ? `Version v${newVersion} erstellt.`
            : "Preset aktualisiert.",
      });

      // Wenn man gerade eine Revision ansieht (?v=...), zurück auf Current
      router.push(`/admin/presets/${presetId}`);
      router.refresh();
    } catch (e: any) {
      setNotice({ kind: "error", message: e?.message ?? String(e) });
    } finally {
      setUpdateBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Link
        href="/admin/presets"
        className="inline-flex items-center justify-center rounded border px-3 py-2 text-sm hover:bg-gray-50"
      >
        Zurück
      </Link>

      <Link
        href="/admin/forms/new"
        className="inline-flex items-center justify-center rounded border px-3 py-2 text-sm hover:bg-gray-50"
        title="Formular aus Vorlage erstellen (Auswahl erfolgt auf der Seite)"
      >
        Neues Formular
      </Link>

      <button
        type="button"
        disabled={updateBusy}
        onClick={() => {
          setNotice(null);
          setUpdateOpen(true);
        }}
        className="inline-flex items-center justify-center rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
        title="Erzeugt eine neue Snapshot-Version und legt den bisherigen Stand als Revision ab"
      >
        {updateBusy ? "Aktualisiere…" : "Preset aktualisieren"}
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="inline-flex items-center justify-center rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
      >
        {busy ? "Lösche…" : "Löschen"}
      </button>

      {notice ? (
        <div
          className={`mt-1 max-w-[240px] rounded border px-2 py-1 text-xs ${
            notice.kind === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {updateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded border bg-white p-4 shadow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Preset aktualisieren</div>
                <div className="mt-1 text-sm text-gray-600">
                  Quelle wählen: daraus wird eine neue Snapshot-Version erzeugt. Der bisherige Stand bleibt als Historie
                  erhalten.
                </div>
              </div>

              <button
                type="button"
                className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
                onClick={() => setUpdateOpen(false)}
                disabled={updateBusy}
                aria-label="Schliessen"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">Quelle Formular</label>

              {formsLoading ? (
                <div className="mt-2 text-sm text-gray-600">Lade Formulare…</div>
              ) : formsError ? (
                <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                  {formsError}
                </div>
              ) : (
                <select
                  className="mt-2 w-full rounded border px-3 py-2 text-sm"
                  value={selectedFormId ?? ""}
                  onChange={(e) => setSelectedFormId(Number(e.target.value) || null)}
                  disabled={updateBusy}
                >
                  {forms.length === 0 ? <option value="">Keine Formulare gefunden</option> : null}
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (#{f.id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                onClick={() => setUpdateOpen(false)}
                disabled={updateBusy}
              >
                Abbrechen
              </button>

              <button
                type="button"
                className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                onClick={onUpdatePreset}
                disabled={updateBusy || formsLoading || !!formsError || !selectedFormId}
              >
                {updateBusy ? "Aktualisiere…" : "Aktualisieren"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
