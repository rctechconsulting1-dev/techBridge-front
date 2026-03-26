"use client";

import { useMemo, useState } from "react";
import type { SiteSettings } from "@/lib/cms-types";

interface Props {
  websiteId: string | number;
  settings: SiteSettings | null;
}

interface FormState {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  startAt: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  startAt: "",
  notes: "",
};

export default function BookingSection({ websiteId, settings }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const primary = settings?.primary_color ?? "#CD7F32";
  const accent = settings?.accent_color ?? "#111827";

  const contactCards = useMemo(
    () =>
      [
        settings?.contact_email
          ? {
              label: "Email",
              value: settings.contact_email,
              href: `mailto:${settings.contact_email}`,
            }
          : null,
        settings?.contact_phone
          ? {
              label: "Phone",
              value: settings.contact_phone,
              href: `tel:${settings.contact_phone}`,
            }
          : null,
        settings?.address
          ? {
              label: "Location",
              value: settings.address,
              href: null,
            }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string; href: string | null }>,
    [settings],
  );

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);
    setSubmitError(null);

    if (!websiteId) {
      setSubmitError("This form is not configured yet.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bookings/public/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteId,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || undefined,
          startAt: form.startAt || undefined,
          notes: form.notes || undefined,
          metadata: {
            source: "tenant_site_contact_section",
          },
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        booking?: { id?: string | number };
      };

      if (!response.ok) {
        setSubmitError(payload.error || `Request failed (${response.status})`);
        return;
      }

      setSubmitMessage(
        payload.booking?.id
          ? `Thanks, your request #${payload.booking.id} is in our queue.`
          : "Thanks, your request is in our queue.",
      );
      setForm(INITIAL_FORM);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to send your request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      aria-label="Contact and booking"
      className="scroll-mt-20 bg-white py-20"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p
            className="mb-3 text-xs font-semibold tracking-[0.24em] uppercase"
            style={{ color: primary }}
          >
            Book a Consultation
          </p>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Tell us what you need
          </h2>
          <p className="mb-8 max-w-xl text-lg text-gray-600">
            Share a few details and we will follow up with timing, scope options,
            and next steps.
          </p>

          {contactCards.length > 0 && (
            <div className="space-y-4">
              {contactCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-gray-200 px-4 py-3"
                >
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    {item.label}
                  </p>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-sm font-medium text-gray-800 transition-opacity hover:opacity-70"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm sm:p-8"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label htmlFor="contactName" className="mb-2 block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                required
                value={form.contactName}
                onChange={onChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2"
                style={{
                  boxShadow: "none",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.setProperty("--tw-ring-color", primary);
                }}
              />
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="contactEmail" className="mb-2 block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                value={form.contactEmail}
                onChange={onChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2"
                onFocus={(e) => {
                  e.currentTarget.style.setProperty("--tw-ring-color", primary);
                }}
              />
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="contactPhone" className="mb-2 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                value={form.contactPhone}
                onChange={onChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2"
                onFocus={(e) => {
                  e.currentTarget.style.setProperty("--tw-ring-color", primary);
                }}
              />
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="startAt" className="mb-2 block text-sm font-medium text-gray-700">
                Preferred Date
              </label>
              <input
                id="startAt"
                name="startAt"
                type="datetime-local"
                value={form.startAt}
                onChange={onChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2"
                onFocus={(e) => {
                  e.currentTarget.style.setProperty("--tw-ring-color", primary);
                }}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-2 block text-sm font-medium text-gray-700">
                Project Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={5}
                value={form.notes}
                onChange={onChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2"
                onFocus={(e) => {
                  e.currentTarget.style.setProperty("--tw-ring-color", primary);
                }}
                placeholder="Goals, scope, and timeline"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 inline-flex w-full items-center justify-center rounded-md px-5 py-3 text-sm font-semibold tracking-wide text-white uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: `linear-gradient(90deg, ${primary}, ${accent})`,
            }}
          >
            {isSubmitting ? "Sending..." : "Request Consultation"}
          </button>

          {submitMessage ? <p className="mt-4 text-sm text-green-700">{submitMessage}</p> : null}
          {submitError ? <p className="mt-4 text-sm text-red-700">{submitError}</p> : null}
        </form>
      </div>
    </section>
  );
}