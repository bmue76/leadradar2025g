// app/(admin)/admin/leads/page.tsx

import Link from 'next/link';

interface LeadsOverviewPageProps {
  searchParams?: {
    formId?: string;
  };
}

/**
 * Placeholder für eine globale Leads-Übersicht.
 *
 * Aktuell existiert in LeadRadar2025g nur die Formular-spezifische
 * Leads-Ansicht unter /admin/forms/[id]/leads.
 *
 * Diese Seite dient dazu:
 * - 404-Fehler auf /admin/leads zu vermeiden
 * - klar zu kommunizieren, wie man aktuell zu den Leads gelangt
 * - einen Ankerpunkt für ein späteres Teilprojekt "Globale Leads-Übersicht" zu haben
 */
export default function LeadsOverviewPage({ searchParams }: LeadsOverviewPageProps) {
  const formId = searchParams?.formId;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Leads-Übersicht</h1>
        <p className="text-sm text-gray-600">
          Aktuell werden Leads in LeadRadar2025g ausschliesslich
          <span className="font-semibold"> formularspezifisch</span> angezeigt.
        </p>
      </div>

      {formId ? (
        <div className="border rounded-lg p-4 bg-white space-y-2">
          <p className="text-sm">
            Du hast diese Seite offenbar mit einem <code>formId</code>-Parameter
            aufgerufen (<code>{formId}</code>).
          </p>
          <p className="text-sm">
            Bitte öffne die Leads direkt über die Formular-Detailseite:
          </p>
          <pre className="text-xs bg-gray-50 p-2 rounded border">
            /admin/forms/{formId}/leads
          </pre>
          <Link
            href={`/admin/forms/${formId}/leads`}
            className="inline-flex mt-2 text-sm text-blue-600 underline"
          >
            Leads für dieses Formular anzeigen
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-white space-y-2">
          <p className="text-sm">
            Öffne zunächst ein Formular unter{' '}
            <Link href="/admin/forms" className="text-blue-600 underline">
              /admin/forms
            </Link>
            {' '}und nutze dort den Link zur Leads-Ansicht.
          </p>
          <p className="text-xs text-gray-500">
            Hinweis: Eine echte globale Leads-Übersicht (über alle Formulare hinweg)
            ist für ein späteres Teilprojekt vorgesehen.
          </p>
        </div>
      )}
    </div>
  );
}
