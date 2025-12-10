# Teilprojekt 1.5 – Stripe Billing & Access Control (Backend)

## Ziel

Backend-Grundlage für ein echtes Subscription-SaaS für LeadRadar:

- Billing-Datenmodell in Prisma (Subscription pro Tenant).
- Anbindung an Stripe (Checkout, Webhook).
- Subscription-Status-API für die Admin-UI.
- Access-Control-Helper für zukünftige Feature-Gates.

---

## Datenmodell

### Prisma-Enum

```prisma
enum SubscriptionStatus {
  trialing
  active
  past_due
  canceled
  incomplete
  incomplete_expired
  unpaid
}
