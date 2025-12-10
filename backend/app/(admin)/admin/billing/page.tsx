// app/(admin)/admin/billing/page.tsx
import React from "react";
import { BillingActionButton } from "./BillingActionButton";

type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | string;

type BillingSubscription = {
  id: string;
  status: SubscriptionStatus;
  priceId?: string | null;
  currentPeriodEnd?: string | null;
};

type BillingStatusResponse = {
  subscription: BillingSubscription | null;
  isActive: boolean;
};

async function fetchBillingStatus(): Promise<{
  data: BillingStatusResponse | null;
  error: string | null;
}> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/admin/billing/status`, {
      method: "GET",
      headers: {
        "x-user-id": "1", // Dev-Stub: aktueller Tenant-User
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(
        "Failed to load billing status",
        res.status,
        res.statusText,
        text
      );
      return {
        data: null,
        error: `Fehler beim Laden des Abo-Status (Status ${res.status}).`,
      };
    }

    const json = (await res.json()) as BillingStatusResponse;
    return { data: json, error: null };
  } catch (err) {
    console.error("Error while fetching billing status", err);
    return {
      data: null,
      error:
        "Es ist ein unerwarteter Fehler beim Laden des Abo-Status aufgetreten.",
    };
  }
}

function formatStatus(status: SubscriptionStatus | undefined): string {
  if (!status) return "Unbekannt";

  switch (status) {
    case "trialing":
      return "Testphase";
    case "active":
      return "Aktiv";
    case "past_due":
      return "Zahlung überfällig";
    case "canceled":
      return "Gekündigt";
    case "unpaid":
      return "Unbezahlt";
    case "incomplete":
      return "Unvollständig";
    case "incomplete_expired":
      return "Unvollständig (abgelaufen)";
    default:
      return status;
  }
}

function badgeClasses(status: SubscriptionStatus | undefined, isActive: boolean) {
  if (isActive) {
    return "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800";
  }
  if (!status) {
    return "inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700";
  }

  switch (status) {
    case "trialing":
      return "inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800";
    case "active":
      return "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800";
    case "past_due":
    case "unpaid":
      return "inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800";
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
      return "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800";
    default:
      return "inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700";
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminBillingPage() {
  const { data, error } = await fetchBillingStatus();

  const subscription = data?.subscription ?? null;
  const isActive = data?.isActive ?? false;
  const hasSubscription = !!subscription;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Billing / Abo-Status
        </h1>
        <p className="text-sm text-slate-500">
          Überblick über dein LeadRadar-Abo und den aktuellen Abrechnungsstatus.
        </p>
      </div>

      {/* Error-Box */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold mb-1">Fehler</p>
          <p>{error}</p>
        </div>
      )}

      {/* Kein Abo */}
      {!error && !hasSubscription && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Abo-Status</h2>
            <span className={badgeClasses(undefined, false)}>
              Kein aktives Abo
            </span>
          </div>
          <p className="text-sm">
            <span className="font-medium">Noch kein aktives Abo.</span>
            <br />
            Aktuell ist für diesen Tenant kein LeadRadar-Abo hinterlegt.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Starte jetzt dein Abo, um Formulare und Events produktiv für deine
            Messen zu nutzen.
          </p>

          <div className="mt-4 border-t border-dashed border-slate-200 pt-3 flex flex-col gap-2">
            <BillingActionButton mode="start" />
            <p className="text-xs text-slate-400">
              Du wirst zu Stripe weitergeleitet, um dein Abo zu starten.
            </p>
          </div>
        </div>
      )}

      {/* Abo vorhanden */}
      {!error && hasSubscription && subscription && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Abo-Status</h2>
            <span className={badgeClasses(subscription.status, isActive)}>
              {formatStatus(subscription.status)}
            </span>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Abo aktiv:</dt>
              <dd className="font-medium">{isActive ? "Ja" : "Nein"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Plan / Price-ID:</dt>
              <dd className="font-mono text-xs">
                {subscription.priceId || "-"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Aktuelle Periode bis:</dt>
              <dd className="font-medium">
                {formatDate(subscription.currentPeriodEnd)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-dashed border-slate-200 pt-3 flex flex-col gap-2">
            <BillingActionButton mode="manage" />
            <p className="text-xs text-slate-400">
              Du wirst zu Stripe weitergeleitet, um dein Abo zu verwalten.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
