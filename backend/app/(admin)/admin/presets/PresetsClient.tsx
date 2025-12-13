"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormPresetListItem, PresetCategoryFacet } from "@/lib/types/form-presets";

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

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
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
        headers: {
          "x-user-id": auth.userId,
          ...(auth.tenantId ? { "x-tenant-id": auth.tenantId } : {}),
        },
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

        <Link
          href="/admin/forms"
          className="inline-flex items-center justify-center rounded border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Preset erstellen
        </Link>
      </div>

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
            Tipp: “Preview” führt zur Detailseite.
          </div>
        </div>
      )}
    </div>
  );
}
