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
