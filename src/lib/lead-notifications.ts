type LeadNotificationInput = {
  origin: string;
  websiteId?: string | number;
  tenantId?: string | number;
  bookingId?: string | number;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  startAt?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  source: string;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatValue = (value: string) => escapeHtml(value).replaceAll("\n", "<br />");

const toScalarText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
};

const buildNotificationBody = ({
  bookingId,
  contactName,
  contactEmail,
  contactPhone,
  startAt,
  notes,
  metadata,
  source,
}: Omit<LeadNotificationInput, "origin" | "tenantId" | "websiteId">) => {
  const rows = [
    { label: "Lead source", value: source },
    bookingId ? { label: "Request ID", value: String(bookingId) } : null,
    { label: "Contact name", value: contactName },
    { label: "Contact email", value: contactEmail },
    contactPhone ? { label: "Contact phone", value: contactPhone } : null,
    startAt ? { label: "Requested time", value: startAt } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const metadataRows = Object.entries(metadata || {})
    .map(([key, value]) => {
      const scalar = toScalarText(value);
      return scalar
        ? {
            label: key
              .replaceAll(/[_-]+/g, " ")
              .replace(/\b\w/g, (match) => match.toUpperCase()),
            value: scalar,
          }
        : null;
    })
    .filter(Boolean) as Array<{ label: string; value: string }>;

  const bodyRows = [...rows, ...metadataRows]
    .map(
      ({ label, value }) =>
        `<p style="margin:0 0 10px;"><strong>${escapeHtml(label)}:</strong> ${formatValue(value)}</p>`,
    )
    .join("");

  const notesMarkup = notes?.trim()
    ? `<div style="margin-top:18px;"><strong>Notes:</strong><div style="margin-top:8px;white-space:normal;">${formatValue(notes.trim())}</div></div>`
    : "";

  return `${bodyRows}${notesMarkup}`;
};

export async function triggerLeadNotification({
  origin,
  websiteId,
  tenantId,
  bookingId,
  contactName,
  contactEmail,
  contactPhone,
  startAt,
  notes,
  metadata,
  source,
}: LeadNotificationInput) {
  const response = await fetch(new URL("/api/email/notify", origin), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      websiteId,
      tenantId,
      subject: bookingId ? `New lead submission #${bookingId}` : "New lead submission",
      heading: "New lead submission received",
      body: buildNotificationBody({
        bookingId,
        contactName,
        contactEmail,
        contactPhone,
        startAt,
        notes,
        metadata,
        source,
      }),
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}