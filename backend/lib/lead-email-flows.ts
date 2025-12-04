// backend/lib/lead-email-flows.ts
import type { Lead, Form, Tenant } from '@prisma/client';
import { sendMail, getInternalRecipientsFromEnv } from './mail';
import {
  buildThankYouEmail,
  buildInternalLeadNotification,
} from './mail-templates';

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

/**
 * Versucht, eine E-Mail-Adresse aus den Lead-Werten zu extrahieren.
 * Unterstützte Keys: email, eMail, mail.
 */
function extractLeadEmail(values: LeadValuesObject): string | undefined {
  return (
    extractStringField(values, 'email') ??
    extractStringField(values, 'eMail') ??
    extractStringField(values, 'mail')
  );
}

/**
 * Liest ein Feature-Flag aus der Umgebung.
 */
function isFeatureEnabled(envKey: string, defaultValue: boolean): boolean {
  const raw = process.env[envKey];

  if (raw == null) return defaultValue;

  const normalized = raw.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  return defaultValue;
}

/**
 * Zentraler Hook, der nach erfolgreicher Lead-Erstellung aufgerufen werden kann.
 *
 * - Versendet optional eine Danke-Mail an den Lead (falls E-Mail vorhanden & Feature aktiviert).
 * - Versendet optional eine Innendienst-Benachrichtigung an interne Empfänger.
 * - Fängt alle Fehler ab und loggt sie, ohne Exceptions nach aussen zu werfen.
 */
export async function handleLeadCreatedEmailFlows(params: {
  lead: Lead;
  form: Form;
  tenant: Tenant;
}): Promise<void> {
  const { lead, form, tenant } = params;

  const values = getLeadValuesObject(lead);
  const leadEmail = extractLeadEmail(values);

  const thankYouEnabled = isFeatureEnabled('LEADS_THANK_YOU_ENABLED', true);
  const internalNotifyEnabled = isFeatureEnabled(
    'LEADS_INTERNAL_NOTIFY_ENABLED',
    true,
  );

  // 1) Danke-Mail an den Lead
  if (thankYouEnabled && leadEmail) {
    try {
      const { subject, html, text } = buildThankYouEmail({
        lead,
        form,
        tenant,
      });

      const result = await sendMail({
        to: leadEmail,
        subject,
        html,
        text,
      });

      if (!result.ok) {
        console.error('[lead-email-flows] Danke-Mail konnte nicht gesendet werden.', {
          leadId: lead.id,
          formId: form.id,
          tenantId: tenant.id,
          error: result.error,
        });
      }
    } catch (err) {
      console.error(
        '[lead-email-flows] Exception beim Senden der Danke-Mail:',
        err,
      );
    }
  } else if (thankYouEnabled && !leadEmail) {
    console.info(
      '[lead-email-flows] Danke-Mail aktiviert, aber keine E-Mail-Adresse im Lead gefunden.',
      {
        leadId: lead.id,
        formId: form.id,
        tenantId: tenant.id,
      },
    );
  }

  // 2) Innendienst-Benachrichtigung
  if (internalNotifyEnabled) {
    const internalRecipients = getInternalRecipientsFromEnv();

    if (internalRecipients.length === 0) {
      console.warn(
        '[lead-email-flows] LEADS_INTERNAL_NOTIFY_ENABLED=true, aber keine MAIL_INTERNAL_RECIPIENTS konfiguriert.',
        {
          leadId: lead.id,
          formId: form.id,
          tenantId: tenant.id,
        },
      );
      return;
    }

    try {
      const { subject, html, text } = buildInternalLeadNotification({
        lead,
        form,
        tenant,
      });

      const result = await sendMail({
        to: internalRecipients,
        subject,
        html,
        text,
        // Praktisch: Reply-To an die Lead-Adresse setzen, falls vorhanden
        replyTo: leadEmail,
      });

      if (!result.ok) {
        console.error(
          '[lead-email-flows] Innendienst-Mail konnte nicht gesendet werden.',
          {
            leadId: lead.id,
            formId: form.id,
            tenantId: tenant.id,
            error: result.error,
          },
        );
      }
    } catch (err) {
      console.error(
        '[lead-email-flows] Exception beim Senden der Innendienst-Mail:',
        err,
      );
    }
  }
}
