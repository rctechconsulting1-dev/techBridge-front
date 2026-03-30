/**
 * Shared Resend client singleton.
 *
 * All server-side code that needs a `Resend` instance should import
 * `getResendClient()` from here instead of creating its own.
 */

import { Resend } from "resend";

let instance: Resend | null = null;

export function getResendClient(): Resend {
  if (!instance) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    instance = new Resend(key);
  }
  return instance;
}
