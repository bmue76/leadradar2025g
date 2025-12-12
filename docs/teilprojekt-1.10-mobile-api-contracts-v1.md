# Teilprojekt 1.10 – Mobile-API Contracts & Versioning (v1)

Stand: 2025-12-12  
Projekt: LeadRadar2025g

## Ziel
Die Mobile-API ist versioniert und hat klare, stabile DTOs, sodass eine Expo-App die Endpunkte „blind“ implementieren kann.

Base Path (v1):
- `/api/mobile/v1/...`

Security:
- **Alle Mobile-v1 Endpoints benötigen** `x-api-key`
- Auth/Scope: `requireApiKeyContext` → tenant-scoped
- Rate Limit: pro API-Key + IP (Dual Rate Limit, lib/api-rate-limit.ts)

---

## Header
Pflicht:
- `x-api-key: <API_KEY>`

Optional (Clients):
- `content-type: application/json` (bei POST)

---

## Fehlerformat (v1)
Die v1-Routen liefern konsistent JSON mit mindestens:

```json
{ "error": "..." }
