// app/(admin)/admin/billing/BillingActionButton.tsx
"use client";

import React, { useState } from "react";

type BillingActionButtonProps = {
  mode: "start" | "manage";
};

export function BillingActionButton({ mode }: BillingActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = mode === "start" ? "Abo jetzt starten" : "Abo verwalten";

  async function handleClick() {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1", // Dev-Stub für aktuellen User/Tenant
        },
      });

      if (!res.ok) {
        let message = "Die Checkout-Session konnte nicht erstellt werden.";

        try {
          const data = await res.json();
          if (data && typeof data.error === "string") {
            message = data.error;
          }
        } catch {
          const text = await res.text();
          if (text) {
            message = text;
          }
        }

        setError(message);
        return;
      }

      const data = (await res.json()) as { url?: string };

      if (data?.url) {
        // Redirect zu Stripe
        window.location.href = data.url;
        return;
      } else {
        setError(
          "Unerwartete Antwort vom Server: keine Checkout-URL gefunden."
        );
      }
    } catch (err) {
      console.error("Error while creating checkout session", err);
      setError(
        "Es ist ein Fehler bei der Verbindung zum Server aufgetreten. Bitte versuche es erneut."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? "Weiterleiten ..." : label}
      </button>
      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
