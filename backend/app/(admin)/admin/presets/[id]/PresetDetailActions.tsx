"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PresetDetailActions({
  presetId,
  auth,
}: {
  presetId: number;
  auth: { userId: string; tenantId: string | null };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    const ok = window.confirm("Willst du diese Vorlage wirklich löschen?");
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/form-presets/${presetId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": auth.userId,
          ...(auth.tenantId ? { "x-tenant-id": auth.tenantId } : {}),
        },
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
        disabled={busy}
        onClick={onDelete}
        className="inline-flex items-center justify-center rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
      >
        {busy ? "Lösche…" : "Löschen"}
      </button>
    </div>
  );
}
