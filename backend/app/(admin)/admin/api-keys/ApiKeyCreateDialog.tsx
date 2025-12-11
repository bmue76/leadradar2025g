"use client";

import React, { useState } from "react";
import type { ApiKeyDto } from "./page";

type ApiKeyCreateDialogProps = {
  onCreated: (apiKey: ApiKeyDto) => void;
};

type CreateApiKeyResponse = {
  apiKey: ApiKeyDto;
  plainKey: string;
  note?: string;
  error?: string;
};

export function ApiKeyCreateDialog({ onCreated }: ApiKeyCreateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateApiKeyResponse | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  function resetState() {
    setName("");
    setIsSubmitting(false);
    setSubmitError(null);
    setResult(null);
    setCopyFeedback(null);
  }

  function openDialog() {
    resetState();
    setIsOpen(true);
  }

  function closeDialog() {
    setIsOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError("Bitte einen Namen für den API-Key angeben.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setCopyFeedback(null);

    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Dev-Stub für requireAuthContext
          "x-user-id": "1",
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = (await res.json()) as CreateApiKeyResponse;

      if (!res.ok) {
        console.error("Failed to create API key", res.status, data);
        setSubmitError(
          data?.error ||
            "Der API-Key konnte nicht erstellt werden. Bitte später erneut versuchen.",
        );
        setIsSubmitting(false);
        return;
      }

      if (!data.apiKey || !data.plainKey) {
        setSubmitError(
          "Unerwartete Antwort vom Server. Bitte später erneut versuchen.",
        );
        setIsSubmitting(false);
        return;
      }

      setResult(data);
      // Button bleibt danach „weiter“ aktiv, aber das Formular wird nicht neu gesendet
      setIsSubmitting(false);
    } catch (err) {
      console.error("Error while creating API key", err);
      setSubmitError(
        "Es ist ein Fehler beim Erstellen des API-Keys aufgetreten.",
      );
      setIsSubmitting(false);
    }
  }

  async function handleCopyPlainKey() {
    if (!result?.plainKey) return;
    try {
      await navigator.clipboard.writeText(result.plainKey);
      setCopyFeedback("In Zwischenablage kopiert.");
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      console.error("Clipboard error", err);
      setCopyFeedback("Konnte nicht kopiert werden. Bitte manuell markieren.");
      setTimeout(() => setCopyFeedback(null), 4000);
    }
  }

  function handleFinish() {
    if (result?.apiKey) {
      onCreated(result.apiKey);
    }
    closeDialog();
  }

  return (
    <>
      {/* Trigger-Button */}
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        + Neuen API-Key erstellen
      </button>

      {/* Modal-Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Neuen API-Key erstellen
                </h2>
                <p className="mt-1 text-xs text-gray-600">
                  Der vollständige API-Key wird dir nur ein einziges Mal
                  angezeigt. Bitte kopiere ihn direkt nach der Erstellung und
                  speichere ihn sicher (z.&nbsp;B. im Passwort-Manager).
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

            {/* Formular / Ergebnis */}
            {!result && (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="space-y-1">
                  <label
                    htmlFor="api-key-name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Name
                  </label>
                  <input
                    id="api-key-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="z. B. Mobile App Prod, Integration XY"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500">
                    Der Name hilft dir, den Einsatz des API-Keys später
                    nachzuvollziehen.
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
                    {isSubmitting ? "Erstelle..." : "API-Key erstellen"}
                  </button>
                </div>
              </form>
            )}

            {/* Ergebnis-Ansicht mit Klartext-Key */}
            {result && (
              <div className="mt-4 space-y-4">
                <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
                  <p className="font-semibold">API-Key erstellt</p>
                  <p className="mt-1">
                    Der folgende API-Key wird dir nur einmal im Klartext
                    angezeigt. Kopiere ihn jetzt und speichere ihn sicher. Der
                    Key kann später nicht noch einmal angezeigt werden.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Klartext-API-Key
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800 break-all">
                      {result.plainKey}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPlainKey}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Kopieren
                    </button>
                  </div>
                  {copyFeedback && (
                    <p className="text-[11px] text-gray-500">{copyFeedback}</p>
                  )}
                </div>

                {result.note && (
                  <p className="text-[11px] text-gray-500">{result.note}</p>
                )}

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Verstanden &amp; schließen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
