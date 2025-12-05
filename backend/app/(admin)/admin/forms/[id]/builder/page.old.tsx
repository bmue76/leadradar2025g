// app/(admin)/admin/forms/[id]/builder/page.tsx

import { redirect } from 'next/navigation';

type FormBuilderRedirectPageParams = {
  id?: string;
  formId?: string;
  [key: string]: string | undefined;
};

interface FormBuilderRedirectPageProps {
  params: FormBuilderRedirectPageParams;
}

/**
 * Legacy-Route:
 * /admin/forms/[irgendwas]/builder ist ab Teilprojekt 2.6 nur noch
 * ein Redirect auf den zentralen Formbuilder-Workspace:
 * /admin/forms/[id]
 *
 * Da der Param-Name je nach Ordnerstruktur unterschiedlich sein kann (id, formId, ...),
 * ermitteln wir die ID defensiv.
 */
function resolveFormId(params: FormBuilderRedirectPageParams): string | undefined {
  // 1. Bevorzugt bekannte Keys
  if (params.id) return params.id;
  if (params.formId) return params.formId;

  // 2. Fallback: erster definierter Wert im Params-Objekt
  const firstDefined = Object.values(params).find((value) => typeof value === 'string' && value.length > 0);
  return firstDefined;
}

export default function FormBuilderRedirectPage({ params }: FormBuilderRedirectPageProps) {
  const formId = resolveFormId(params);

  if (!formId) {
    // Fallback: Zur Formularliste
    redirect('/admin/forms');
  }

  // Canonical Formbuilder-Workspace-Route
  redirect(`/admin/forms/${formId}`);
}
