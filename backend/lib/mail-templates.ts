// backend/lib/mail-templates.ts
import type { Lead, Form, Tenant } from '@prisma/client';

type LeadValuesObject = Record<string, unknown>;

function getLeadValuesObject(lead: Lead): LeadValuesObject {
  const raw = (lead as any).values;

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as LeadValuesObject;
  }

  return {};
}

function extractStringField(
  values: LeadValuesObject,
  key: string,
): string | undefined {
  const raw = values[key];

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(raw)) {
    const joined = raw
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0)
      .join(', ');
    return joined.length > 0 ? joined : undefined;
  }

  if (raw != null) {
    const asString = String(raw).trim();
    return asString.length > 0 ? asString : undefined;
  }

  return undefined;
}

function guessLeadDisplayName(values: LeadValuesObject): string | undefined {
  const firstName =
    extractStringField(values, 'firstName') ??
    extractStringField(values, 'vorname');
  const lastName =
    extractStringField(values, 'lastName') ??
    extractStringField(values, 'nachname');

  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;

  const name =
    extractStringField(values, 'name') ??
    extractStringField(values, 'fullName');
  return name;
}

function renderLeadValuesAsHtmlTable(values: LeadValuesObject): string {
  const entries = Object.entries(values);

  if (entries.length === 0) {
    return '<p>Es wurden keine Detailangaben erfasst.</p>';
  }

  const rows = entries
    .map(([key, value]) => {
      const label = key;
      const val =
        typeof value === 'string'
          ? value
          : Array.isArray(value)
            ? value.join(', ')
            : value == null
              ? ''
              : String(value);

      return `
        <tr>
          <td style="padding: 4px 8px; border: 1px solid #ddd; font-weight: 500; white-space: nowrap;">
            ${escapeHtml(label)}
          </td>
          <td style="padding: 4px 8px; border: 1px solid #ddd;">
            ${escapeHtml(val)}
          </td>
        </tr>`;
    })
    .join('');

  return `
    <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #ddd; width: 100%; max-width: 600px;">
      <tbody>
        ${rows}
      </tbody>
    </table>`;
}

function renderLeadValuesAsText(values: LeadValuesObject): string {
  const entries = Object.entries(values);

  if (entries.length === 0) {
    return 'Keine Detailangaben erfasst.';
  }

  return entries
    .map(([key, value]) => {
      const val =
        typeof value === 'string'
          ? value
          : Array.isArray(value)
            ? value.join(', ')
            : value == null
              ? ''
              : String(value);
      return `${key}: ${val}`;
    })
    .join('\n');
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Baut das Danke-Mail-Template an den Lead.
 */
export function buildThankYouEmail(params: {
  lead: Lead;
  form: Form;
  tenant: Tenant;
}): { subject: string; html: string; text: string } {
  const { lead, form, tenant } = params;
  const values = getLeadValuesObject(lead);

  const displayName = guessLeadDisplayName(values);
  const greetingName = displayName ?? 'Guten Tag';

  const formName = form.name ?? 'unserem Messestand';
  const tenantName = tenant.name ?? 'Ihr LeadRadar-Team';

  const subject = `Danke für Ihren Besuch – ${formName}`;

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: #111; line-height: 1.5;">
      <p>${escapeHtml(greetingName)},</p>
      <p>
        vielen Dank für Ihren Besuch an unserem Messestand und Ihr Interesse.
        Wir haben Ihre Angaben erhalten und werden uns in Kürze bei Ihnen melden.
      </p>
      <p>
        Falls Sie in der Zwischenzeit Fragen haben, können Sie uns jederzeit
        kontaktieren – wir helfen Ihnen gerne weiter.
      </p>
      <p style="margin-top: 24px;">
        Freundliche Grüsse<br/>
        ${escapeHtml(tenantName)}
      </p>
    </div>
  `;

  const text = [
    `${greetingName},`,
    '',
    'vielen Dank für Ihren Besuch an unserem Messestand und Ihr Interesse.',
    'Wir haben Ihre Angaben erhalten und werden uns in Kürze bei Ihnen melden.',
    '',
    'Falls Sie in der Zwischenzeit Fragen haben, können Sie uns jederzeit kontaktieren – wir helfen Ihnen gerne weiter.',
    '',
    `Freundliche Grüsse`,
    tenantName,
  ].join('\n');

  return { subject, html, text };
}

/**
 * Baut das Innendienst-Benachrichtigungs-Mail für einen neuen Lead.
 */
export function buildInternalLeadNotification(params: {
  lead: Lead;
  form: Form;
  tenant: Tenant;
}): { subject: string; html: string; text: string } {
  const { lead, form, tenant } = params;
  const values = getLeadValuesObject(lead);

  const displayName = guessLeadDisplayName(values);
  const company =
    extractStringField(values, 'company') ??
    extractStringField(values, 'firma');
  const email =
    extractStringField(values, 'email') ??
    extractStringField(values, 'eMail') ??
    extractStringField(values, 'mail');

  const formName = form.name ?? `Formular #${form.id}`;
  const tenantName = tenant.name ?? 'LeadRadar-Tenant';

  const subject = `Neuer Lead – ${formName}`;

  const metaLines: string[] = [];

  if (displayName) metaLines.push(`Name: ${displayName}`);
  if (company) metaLines.push(`Firma: ${company}`);
  if (email) metaLines.push(`E-Mail: ${email}`);

  const metaText =
    metaLines.length > 0 ? metaLines.join('\n') : 'Keine Basisdaten verfügbar.';

  const htmlDetailsTable = renderLeadValuesAsHtmlTable(values);
  const textDetails = renderLeadValuesAsText(values);

  const createdAt = lead.createdAt?.toISOString?.() ?? String(lead.createdAt);

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111; line-height: 1.5;">
      <p>
        Es wurde ein neuer Lead erfasst.
      </p>
      <p>
        <strong>Tenant:</strong> ${escapeHtml(tenantName)}<br/>
        <strong>Formular:</strong> ${escapeHtml(formName)}<br/>
        <strong>Lead-ID:</strong> ${escapeHtml(String(lead.id))}<br/>
        <strong>Erfasst am:</strong> ${escapeHtml(createdAt)}
      </p>

      ${
        metaLines.length > 0
          ? `
      <p>
        <strong>Kurzüberblick:</strong><br/>
        ${metaLines.map((line) => escapeHtml(line)).join('<br/>')}
      </p>
      `
          : ''
      }

      <p><strong>Alle Felder:</strong></p>
      ${htmlDetailsTable}

      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        Diese Nachricht wurde automatisch von LeadRadar generiert.
      </p>
    </div>
  `;

  const text = [
    'Neuer Lead',
    '',
    `Tenant: ${tenantName}`,
    `Formular: ${formName}`,
    `Lead-ID: ${lead.id}`,
    `Erfasst am: ${createdAt}`,
    '',
    'Kurzüberblick:',
    metaText,
    '',
    'Alle Felder:',
    textDetails,
    '',
    'Diese Nachricht wurde automatisch von LeadRadar generiert.',
  ].join('\n');

  return { subject, html, text };
}
