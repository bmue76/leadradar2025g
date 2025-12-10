# Teilprojekt 2.13 – Admin-UI: Billing-Übersicht & „Abo starten“-Button

## Ziel & Scope

Dieses Teilprojekt macht das Billing im Admin-Bereich sichtbar und integrierbar, ohne bereits ein vollwertiges Abrechnungs-Cockpit zu bauen.

**Kernziele:**

- Neue Admin-Seite `/admin/billing` mit Abo-Status des aktuellen Tenants.
- Anzeige der wichtigsten Subscription-Infos (Status, Plan/Price-ID, Periodenende).
- Klarer visueller Hinweis, ob das Abo aktiv ist.
- „Abo starten / verwalten“-Button, der den Stripe-Checkout-Flow triggert.
- Saubere UX mit Error-Handling, insbesondere solange noch keine „echten“ Stripe-Keys gesetzt sind.

Hinweis: Die tatsächliche Stripe-Anbindung (gültige Keys, echtes Checkout) folgt später, im Kontext von Teilprojekt 1.5 und der produktiven Billing-Konfiguration.

---

## UI-Aufbau: `/admin/billing`

**Datei:**

- `app/(admin)/admin/billing/page.tsx`
- `app/(admin)/admin/billing/BillingActionButton.tsx`

### Page-Layout (`page.tsx`)

- Serverseitige Komponente mit Header:

  - Titel: **„Billing / Abo-Status“**
  - Untertitel: kurzer Beschreibungstext („Überblick über dein LeadRadar-Abo …“)

- Ruft den Status-Endpunkt auf:

  - `GET /api/admin/billing/status`
  - Übergibt im Dev-Stub den Header `x-user-id: "1"` (aktueller Tenant-User).
  - Kein Caching (`cache: "no-store"`).

- Erwartete Response-Struktur (vereinfachte DTOs):

  ```ts
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
