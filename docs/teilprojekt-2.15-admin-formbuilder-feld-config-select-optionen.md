# Teilprojekt 2.15 – Admin-Formbuilder: Feld-Config & Select-Optionen

**Projekt:** LeadRadar2025g  
**Bereich:** Admin-UI – Formbuilder  
**Status:** erledigt  
**Datum:** 2025-12-11

## Ziel

Im Admin-Formbuilder sollen feldspezifische Konfigurationen nutzbar werden – zunächst fokussiert auf Auswahl-Felder (SELECT, später erweiterbar auf MULTISELECT, RADIO, etc.).  
Kernstück ist die Pflege von Optionslisten pro Feld über `FormField.config` und deren Verwendung in der Tablet-Vorschau.

---

## 1. Domain-Konzept & Typen

### 1.1 `FormField.config` für Select-Felder

Für Choice-Felder wird `FormField.config` als JSON-Objekt mit folgender Struktur verwendet:

```ts
interface SelectOptionConfig {
  id: string;
  label: string;
  value: string;
  isDefault?: boolean;
}

interface SelectFieldConfig {
  options: SelectOptionConfig[];
}
