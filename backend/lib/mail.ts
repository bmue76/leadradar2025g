// backend/lib/mail.ts
import { Resend } from 'resend';

export type MailProvider = 'console' | 'resend';

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

/**
 * Normalisiert eine Empfängerangabe (String mit Kommas oder Array) zu einem sauberen String-Array.
 */
function normalizeRecipients(to: string | string[]): string[] {
  if (Array.isArray(to)) {
    return to
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return to
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Liefert den konfigurierten Mail-Provider auf Basis der Umgebungsvariablen.
 * Fällt bei unbekannten Werten auf "console" zurück.
 */
function getMailProviderFromEnv(): MailProvider {
  const raw = (process.env.MAIL_PROVIDER ?? 'console').toLowerCase().trim();

  if (raw === 'resend') {
    return 'resend';
  }

  if (raw !== 'console') {
    console.warn(
      `[mail] Unbekannter MAIL_PROVIDER "${raw}" – fallback auf "console".`,
    );
  }

  return 'console';
}

/**
 * Lazy initialisierter Resend-Client.
 */
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      '[mail] RESEND_API_KEY ist nicht gesetzt. Fallback auf console-Logging.',
    );
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

/**
 * Liefert die Default-From-Adresse.
 */
function getDefaultFrom(): string {
  return (
    process.env.MAIL_FROM_DEFAULT ?? 'LeadRadar <noreply@leadradar.local>'
  );
}

/**
 * Liefert die Default-Reply-To-Adresse, falls gesetzt.
 */
function getDefaultReplyTo(): string | undefined {
  const replyTo = process.env.MAIL_REPLY_TO_DEFAULT?.trim();
  return replyTo && replyTo.length > 0 ? replyTo : undefined;
}

/**
 * Gibt die Innendienst-Empfänger auf Basis von MAIL_INTERNAL_RECIPIENTS zurück.
 * (Komma-separierte Liste in .env)
 */
export function getInternalRecipientsFromEnv(): string[] {
  const raw = process.env.MAIL_INTERNAL_RECIPIENTS;
  if (!raw) return [];
  return normalizeRecipients(raw);
}

/**
 * Zentrale Mail-Sende-Funktion.
 *
 * - Nutzt MAIL_PROVIDER, um zwischen "console" und "resend" zu unterscheiden.
 * - Bricht NIE hart ab: Fehler werden geloggt und als { ok: false, error } zurückgegeben.
 * - Kann später erweitert werden (weitere Provider, Queues, etc.).
 */
export async function sendMail(
  options: SendMailOptions,
): Promise<{ ok: boolean; error?: unknown }> {
  const provider = getMailProviderFromEnv();
  const to = normalizeRecipients(options.to);

  const from = options.from ?? getDefaultFrom();
  const replyTo = options.replyTo ?? getDefaultReplyTo();

  // Sicherheitsnetz: ohne Empfänger macht der Versand keinen Sinn.
  if (to.length === 0) {
    const error = new Error('sendMail: Keine gültigen Empfänger-Adressen.');
    console.error('[mail] Fehler:', error);
    return { ok: false, error };
  }

  if (provider === 'console') {
    console.warn(
      '[mail] MAIL_PROVIDER=console – Mail wird nur geloggt, nicht wirklich versendet.',
    );
    console.info('[mail] Simulierter Mailversand:', {
      provider,
      from,
      to,
      replyTo,
      subject: options.subject,
      hasHtml: Boolean(options.html),
      hasText: Boolean(options.text),
    });
    return { ok: true };
  }

  // Ab hier: Provider "resend"
  const resend = getResendClient();

  if (!resend) {
    // API-Key fehlt – wir loggen die Mail nur und melden den Fehler zurück.
    const error = new Error(
      'Resend-Client konnte nicht initialisiert werden (RESEND_API_KEY fehlt).',
    );
    console.warn('[mail] Fallback: Mail wird nur geloggt, nicht versendet.', {
      reason: error.message,
    });
    console.info('[mail] Simulierter Mailversand (Resend-Fallback):', {
      provider,
      from,
      to,
      replyTo,
      subject: options.subject,
      hasHtml: Boolean(options.html),
      hasText: Boolean(options.text),
    });

    return { ok: false, error };
  }

  try {
    // Hinweis:
    // Die aktuellen TypeScript-Typen von Resend sind recht strikt und
    // erwarten teilweise ein Template-Objekt. Laut offiziellen Beispielen
    // ist das Senden mit { html, text } aber korrekt.
    // Wir casten daher das Payload hier bewusst auf `any`, um TS-Rauschen
    // zu vermeiden und uns am offiziellen API-Verhalten zu orientieren.
    const payload: any = {
      from,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...(replyTo ? { replyTo } : {}),
    };

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error('[mail] Fehler beim Resend-Versand:', error);
      return { ok: false, error };
    }

    console.info('[mail] Mail via Resend versendet:', {
      id: data?.id,
      to,
      subject: options.subject,
    });

    return { ok: true };
  } catch (err) {
    console.error('[mail] Exception beim Resend-Versand:', err);
    return { ok: false, error: err };
  }
}
