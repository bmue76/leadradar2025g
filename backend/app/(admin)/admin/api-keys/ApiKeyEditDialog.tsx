"use client";

import React, { useState } from "react";
import type { ApiKeyDto } from "./page";

type ApiKeyEditDialogProps = {
  apiKey: ApiKeyDto;
  onUpdated: (apiKey: ApiKeyDto) => void;
};

type UpdateApiKeyResponse = {
  apiKey?: ApiKeyDto;
  error?: string;
  details?: unknown;
};

export function ApiKeyEditDialog({ apiKey, onUpdated }: ApiKeyEditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(apiKey.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function openDialog() {
    setName(apiKey.name ?? "");
    setSubmitError(null);
    setIsSubmitting(false);
    setIsOpen(true);
  }

  function closeDialog() {
    setIsOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setSubmitError("Bitte einen Namen angeben.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/admin/api-keys/${apiKey.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1",
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = (await res.json()) as UpdateApiKeyResponse;

      if (!res.ok) {
        console.error(
          "Failed to update API key name",
          res.status,
          data?.error,
          data?.details,
        );
        setSubmitError(
          data?.error ||
            "Der Name konnte nicht aktualisiert werden. Bitte später erneut versuchen.",
        );
        setIsSubmitting(false);
        return;
      }

      if (!data.apiKey) {
        setSubmitError(
          "Unerwartete Antwort vom Server. Bitte später erneut versuchen.",
        );
        setIsSubmitting(false);
        return;
      }

      onUpdated(data.apiKey);
      setIsSubmitting(false);
      closeDialog();
    } catch (err) {
      console.error("Error while updating API key name", err);
      setSubmitError(
        "Es ist ein Fehler beim Aktualisieren des Namens aufgetreten.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-50"
      >
        Bearbeiten
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  API-Key umbenennen
                </h2>
                <p className="mt-1 text-xs text-gray-600">
                  Passe den Namen dieses API-Keys an, um den Einsatzzweck besser
                  zu dokumentieren. Der technische Key selbst bleibt unverändert.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor={`api-key-edit-name-${apiKey.id}`}
                  className="text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  id={`api-key-edit-name-${apiKey.id}`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  Beispiel: &bdquo;Mobile App Prod&ldquo;, &bdquo;Integration
                  CRM&ldquo; usw.
                </p>
              </div>

              {submitError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {submitError}
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Speichere..." : "Speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
