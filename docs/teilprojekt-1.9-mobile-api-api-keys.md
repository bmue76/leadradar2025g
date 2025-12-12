# Teilprojekt 1.9 – Mobile-API: API-Key-Auth & Access Control

## Ziel
Mobile-/Integrations-Endpunkte sind per API-Key abgesichert (Header `x-api-key`) und strikt mandantenfähig (Tenant-Scope via ApiKey → tenantId). Zusätzlich wird Rate Limiting pro API-Key (plus IP) angewendet. Responses/Fehler sind konsistent (`{ error, code, details? }`).

---

## Auth & Header

### API-Key
- Header: `x-api-key: <klartext-api-key>`
- Der Klartext-Key wird nur beim Erstellen angezeigt (Admin UI) und ist danach nicht mehr auslesbar.
- In der DB wird nur `keyHash` gespeichert.
- API-Key ist an genau **einen Tenant** gebunden (Tenant-Scope).

### Wo bekomme ich den API-Key?
Admin-UI:
- `http://localhost:3000/admin/api-keys`
- Neuen Key erstellen → Klartext-Key kopieren und sicher ablegen.

---

## Endpoint-Policy (Mobile/Integration)

Diese Endpoints erfordern zwingend `x-api-key`:

- `GET /api/mobile/events`
- `GET /api/mobile/events/:id/forms`
- `GET /api/forms/:id`
- `POST /api/leads`

Admin-Endpoints bleiben weiterhin `x-user-id` basiert (`/api/admin/...`) und benötigen keinen API-Key.

---

## Rate Limiting
- Rate Limiting wird pro Route auf **API-Key (tenantId+apiKeyId)** und zusätzlich auf **IP** angewandt.
- Bei Limit:
  - Status: `429`
  - Header: `Retry-After: <seconds>`
  - Body:
    ```json
    {
      "error": "Too many requests",
      "code": "RATE_LIMITED",
      "details": {
        "limitedBy": "apiKey" | "ip",
        "retryAfterMs": 12345,
        "retryAfterSeconds": 13
      }
    }
    ```

---

## Fehlercodes (konsistent)

### 401 UNAUTHORIZED
- Missing API key
- Invalid or inactive API key

Response:
```json
{ "error": "Missing API key", "code": "UNAUTHORIZED" }
