"use client";

import React, { useState } from "react";
import type { ApiKeyDto } from "./page";
import { ApiKeyCreateDialog } from "./ApiKeyCreateDialog";
import { ApiKeyEditDialog } from "./ApiKeyEditDialog";

type ApiKeysClientProps = {
  initialItems: ApiKeyDto[];
  initialError?: string | null;
};

type UpdateApiKeyResponse = {
  apiKey?: ApiKeyDto;
  error?: string;
  details?: unknown;
};

function formatDate(value: string | null): string {
  if (!value) return "– nie –";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleString("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ApiKeysClient({
  initialItems,
  initialError,
}: ApiKeysClientProps) {
  const [items, setItems] = useState<ApiKeyDto[]>(initialItems ?? []);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const hasKeys = items.length > 0;

  function handleCreated(newKey: ApiKeyDto) {
    setItems((prev) => [newKey, ...prev]);
    setError(null);
    setRowError(null);
  }

  function handleRowUpdated(updated: ApiKeyDto) {
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
    setError(null);
    setRowError(null);
  }

  async function handleToggleActive(key: ApiKeyDto) {
    const newIsActive = !key.isActive;

    setTogglingId(key.id);
    setRowError(null);

    try {
      const res = await fetch(`/api/admin/api-keys/${key.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({ isActive: newIsActive }),
      });

      const data = (await res.json()) as UpdateApiKeyResponse;

      if (!res.ok || !data.apiKey) {
        console.error(
          "Failed to toggle API key",
          res.status,
          data?.error,
          data?.details,
        );
        setRowError(
          data?.error ||
            "Der Status des API-Keys konnte nicht geändert werden.",
        );
        setTogglingId(null);
        return;
      }

      setItems((prev) =>
        prev.map((item) => (item.id === data.apiKey!.id ? data.apiKey! : item)),
      );
      setTogglingId(null);
    } catch (err) {
      console.error("Error while toggling API key", err);
      setRowError(
        "Es ist ein Fehler beim Ändern des Status aufgetreten. Bitte später erneut versuchen.",
      );
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            API-Keys &amp; Mobile-Access
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            API-Keys ermöglichen den gesicherten Zugriff für Mobile-App und
            Integrationen. Jeder Key ist tenant-spezifisch und wird nur einmal
            im Klartext angezeigt. Bitte vertraulich behandeln.
          </p>
        </div>

        {/* Dialog-Trigger */}
        <ApiKeyCreateDialog onCreated={handleCreated} />
      </div>

      {/* Fehleranzeige */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {rowError && !error && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          {rowError}
        </div>
      )}

      {/* Inhalt */}
      {!error && !hasKeys && (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
          <p className="font-medium">Noch keine API-Keys erstellt.</p>
          <p className="mt-1">
            Erstelle deinen ersten API-Key, um ihn in der Mobile-App oder in
            Integrationen zu verwenden.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Der vollständige Key wird dir nur einmal im Klartext angezeigt. Du
            kannst ihn später nicht noch einmal einsehen.
          </p>
        </div>
      )}

      {!error && hasKeys && (
        <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Erstellt
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Zuletzt verwendet
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Key-Prefix
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((key) => {
                const isToggling = togglingId === key.id;

                return (
                  <tr key={key.id}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">
                        {key.name || "– ohne Namen –"}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {String(key.id)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        {key.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            Inaktiv
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(key)}
                          className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isToggling}
                        >
                          {isToggling
                            ? "Ändere..."
                            : key.isActive
                            ? "Deaktivieren"
                            : "Aktivieren"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-700">
                      {formatDate(key.lastUsedAt)}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs text-gray-800">
                      {key.displayPrefix}
                    </td>
                    <td className="px-4 py-3 align-top text-right text-xs text-gray-500">
                      <div className="inline-flex flex-col items-end gap-1">
                        <ApiKeyEditDialog
                          apiKey={key}
                          onUpdated={handleRowUpdated}
                        />
                        {/* Optional: später noch Delete/Rotate */}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Security-Hinweis */}
      <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-900">
        <p className="font-semibold">Sicherheitshinweis</p>
        <p className="mt-1">
          API-Keys sind ähnlich wie Passwörter zu behandeln. Gib sie nur
          Systemen weiter, die du kontrollierst (z.&nbsp;B. Mobile-App oder
          Integrationen). Der vollständige Key wird nur einmal im Klartext
          angezeigt.
        </p>
      </div>
    </div>
  );
}
