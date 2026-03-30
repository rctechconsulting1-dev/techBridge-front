// ── Payment Config ───────────────────────────────────────────────────────────

export interface PaymentConfig {
  tenant_id: number;
  deposit_enabled: boolean;
  deposit_type: "fixed" | "percentage";
  deposit_value: number;
  estimates_enabled: boolean;
  estimate_valid_days: number;
  reservations_enabled: boolean;
  reservation_deposit_type: "fixed" | "percentage" | "none";
  reservation_deposit_value: number;
  ecommerce_checkout_enabled: boolean;
  platform_fee_percent: number;
  _persisted: boolean;
  created_at?: string;
  updated_at?: string;
}

// ── Estimates ────────────────────────────────────────────────────────────────

export type EstimateStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired"
  | "paid";

export interface EstimateLineItem {
  id: number;
  estimate_id: number;
  description: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  sort_order: number;
}

export interface Estimate {
  id: number;
  tenant_id: number;
  website_id: number | null;
  booking_request_id: number | null;
  estimate_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  status: EstimateStatus;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  sent_at: string | null;
  valid_until: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
  line_items?: EstimateLineItem[];
}

export interface EstimateListResponse {
  estimates: Estimate[];
  count: number;
}

export interface CreateEstimatePayload {
  website_id?: number;
  booking_request_id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  notes?: string;
  tax_cents?: number;
  line_items: {
    description: string;
    quantity: number;
    unit_price_cents: number;
  }[];
}
