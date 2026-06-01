import { api } from "@/lib/api";
import { setTenantId } from "./auth";
import { getActiveTenantId } from "./workspace-session";

const AR_AP_BASE_URL =
  process.env.NEXT_PUBLIC_AR_AP_SERVICE_URL ?? "/api/ar-ap";

/** PDF download is enabled by default; set NEXT_PUBLIC_INVOICE_PDF_ENABLED=false to hide. */
export const INVOICE_PDF_AVAILABLE =
  process.env.NEXT_PUBLIC_INVOICE_PDF_ENABLED !== "false";

function arApOpts() {
  const tenantId = getActiveTenantId();
  if (tenantId) {
    setTenantId(tenantId);
  }
  return { baseUrl: AR_AP_BASE_URL };
}

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "paid"
  | "partial"
  | "overdue";

export type InvoiceLine = {
  id: string;
  account_id: string;
  description: string | null;
  quantity: string | number;
  unit_price: string | number;
  gst_rate: string | number;
  line_total: string | number;
  gst_amount: string | number;
};

export type Invoice = {
  id: string;
  tenant_id: string | null;
  customer_id: string | null;
  invoice_number: string;
  issue_date: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  subtotal: string | number;
  gst_amount: string | number;
  total: string | number;
  journal_entry_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  lines: InvoiceLine[];
};

export type Customer = {
  id: string;
  tenant_id: string | null;
  name: string;
  email: string | null;
  credit_terms_days: number | null;
};

export type InvoiceLineRequest = {
  account_id: string;
  quantity: string;
  unit_price: string;
  description?: string | null;
  gst_rate?: string;
};

export type CreateInvoiceRequest = {
  customer_id: string;
  issue_date: string;
  due_date: string;
  lines: InvoiceLineRequest[];
};

export type UpdateInvoiceRequest = {
  customer_id?: string;
  issue_date?: string;
  due_date?: string;
  lines?: InvoiceLineRequest[];
};

export type ListInvoicesParams = {
  status?: InvoiceStatus;
  customer_id?: string;
  issued_from?: string;
  issued_to?: string;
};

export type CreateCustomerRequest = {
  name: string;
  email?: string | null;
  credit_terms_days?: number | null;
};

export function listInvoices(params?: ListInvoicesParams) {
  const query: Record<string, string> = {};
  if (params?.status) query.status = params.status;
  if (params?.customer_id) query.customer_id = params.customer_id;
  if (params?.issued_from) query.issued_from = params.issued_from;
  if (params?.issued_to) query.issued_to = params.issued_to;
  return api.get<Invoice[]>("/ar-ap/invoices", {
    ...arApOpts(),
    params: Object.keys(query).length ? query : undefined,
  });
}

export function getInvoice(id: string) {
  return api.get<Invoice>(`/ar-ap/invoices/${id}`, arApOpts());
}

export function createInvoice(payload: CreateInvoiceRequest) {
  return api.post<Invoice>("/ar-ap/invoices", payload, arApOpts());
}

export function updateInvoice(id: string, payload: UpdateInvoiceRequest) {
  return api.put<Invoice>(`/ar-ap/invoices/${id}`, payload, arApOpts());
}

export function issueInvoice(id: string) {
  return api.post<Invoice>(`/ar-ap/invoices/${id}/issue`, undefined, arApOpts());
}

export function deleteInvoice(id: string) {
  return api.delete<void>(`/ar-ap/invoices/${id}`, arApOpts());
}

export function listCustomers() {
  return api.get<Customer[]>("/ar-ap/customers", arApOpts());
}

export function createCustomer(payload: CreateCustomerRequest) {
  return api.post<Customer>("/ar-ap/customers", payload, arApOpts());
}

export async function downloadInvoicePdf(id: string): Promise<Blob> {
  const opts = arApOpts();
  const base = opts.baseUrl.replace(/\/$/, "");
  const path = `/ar-ap/invoices/${id}/pdf`;
  const url =
    /^https?:\/\//i.test(base) || base.startsWith("/")
      ? `${base}${path}`
      : path;

  const { getToken, getTenantId } = await import("./auth");
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const tenantId = getTenantId();
  if (tenantId) headers["X-Tenant-ID"] = tenantId;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`PDF download failed (${response.status})`);
  }
  return response.blob();
}

export function isDraftInvoice(invoice: Invoice): boolean {
  return invoice.status === "draft";
}

export function isPostedInvoice(invoice: Invoice): boolean {
  return invoice.status !== "draft";
}

// ── US-9: customer payments ─────────────────────────────────────────────────

export type PaymentMethod =
  | "bank_transfer"
  | "cash"
  | "cheque"
  | "card"
  | "other";

export type Payment = {
  id: string;
  tenant_id: string | null;
  invoice_id: string;
  customer_id: string | null;
  amount: string | number;
  payment_date: string | null;
  payment_method: PaymentMethod | string;
  reference: string | null;
  deposit_account_id: string | null;
  journal_entry_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type InvoiceSettlement = {
  invoice_id: string;
  invoice_total: string | number;
  amount_paid: string | number;
  outstanding: string | number;
};

export type CreatePaymentRequest = {
  payment_date: string;
  amount: string;
  payment_method: PaymentMethod;
  reference?: string | null;
  deposit_account_id: string;
  idempotency_key?: string | null;
};

export type ListPaymentsParams = {
  invoice_id?: string;
  customer_id?: string;
  payment_method?: PaymentMethod;
  date_from?: string;
  date_to?: string;
};

/** Invoice statuses that accept new customer payments (US-9). */
export function canRecordPaymentOnInvoice(invoice: Invoice): boolean {
  return (
    invoice.status === "issued" ||
    invoice.status === "partial" ||
    invoice.status === "overdue"
  );
}

export function listInvoicePayments(invoiceId: string) {
  return api.get<Payment[]>(`/ar-ap/invoices/${invoiceId}/payments`, arApOpts());
}

export function getInvoiceSettlement(invoiceId: string) {
  return api.get<InvoiceSettlement>(
    `/ar-ap/invoices/${invoiceId}/settlement`,
    arApOpts(),
  );
}

export function recordPayment(
  invoiceId: string,
  payload: CreatePaymentRequest,
  options?: { idempotencyKey?: string },
) {
  const headers: Record<string, string> = {};
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }
  return api.post<Payment>(
    `/ar-ap/invoices/${invoiceId}/payments`,
    payload,
    { ...arApOpts(), headers },
  );
}

export function listPayments(params?: ListPaymentsParams) {
  const query: Record<string, string> = {};
  if (params?.invoice_id) query.invoice_id = params.invoice_id;
  if (params?.customer_id) query.customer_id = params.customer_id;
  if (params?.payment_method) query.payment_method = params.payment_method;
  if (params?.date_from) query.date_from = params.date_from;
  if (params?.date_to) query.date_to = params.date_to;
  return api.get<Payment[]>("/ar-ap/payments", {
    ...arApOpts(),
    params: Object.keys(query).length ? query : undefined,
  });
}

export function getPayment(paymentId: string) {
  return api.get<Payment>(`/ar-ap/payments/${paymentId}`, arApOpts());
}

export const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export function paymentMethodLabel(method: string): string {
  return (
    PAYMENT_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method
  );
}
