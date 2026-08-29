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

export type InvoiceStatus = "draft" | "issued" | "paid" | "partial" | "overdue";

export type InvoiceLine = {
  id: string;
  account_id: string;
  gst_code_id: string | null;
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
  gst_code_id?: string | null;
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
  return api.post<Invoice>(
    `/ar-ap/invoices/${id}/issue`,
    undefined,
    arApOpts(),
  );
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
  return api.get<Payment[]>(
    `/ar-ap/invoices/${invoiceId}/payments`,
    arApOpts(),
  );
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
  return api.post<Payment>(`/ar-ap/invoices/${invoiceId}/payments`, payload, {
    ...arApOpts(),
    headers,
  });
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

// ── US-10: credit notes ───────────────────────────────────────────────────────

export type CreditNoteStatus = "issued" | "voided";

export type CreditNoteLine = {
  id: string;
  account_id: string;
  invoice_line_id: string | null;
  gst_code_id: string | null;
  description: string | null;
  quantity: string | number;
  unit_price: string | number;
  gst_rate: string | number;
  line_total: string | number;
  gst_amount: string | number;
};

export type CreditNote = {
  id: string;
  tenant_id: string | null;
  invoice_id: string;
  customer_id: string | null;
  credit_note_number: string;
  issue_date: string;
  reason: string | null;
  status: CreditNoteStatus;
  subtotal: string | number;
  gst_amount: string | number;
  total: string | number;
  journal_entry_id: string | null;
  created_by: string | null;
  created_at: string;
  lines?: CreditNoteLine[];
};

export type CreditNoteLineRequest = {
  account_id: string;
  quantity: string;
  unit_price: string;
  description?: string | null;
  gst_code_id?: string | null;
  gst_rate?: string;
  invoice_line_id?: string | null;
};

export type CreateCreditNoteRequest = {
  issue_date: string;
  reason?: string | null;
  lines: CreditNoteLineRequest[];
  idempotency_key?: string | null;
};

export type ListCreditNotesParams = {
  invoice_id?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
};

/** Invoice statuses that accept new credit notes (US-10). */
export function canIssueCreditNoteOnInvoice(
  invoice: Invoice,
  remainingCreditable: number,
): boolean {
  if (invoice.status === "draft") return false;
  if (remainingCreditable <= 0) return false;
  return (
    invoice.status === "issued" ||
    invoice.status === "partial" ||
    invoice.status === "paid" ||
    invoice.status === "overdue"
  );
}

export function listInvoiceCreditNotes(invoiceId: string) {
  return api.get<CreditNote[]>(
    `/ar-ap/invoices/${invoiceId}/credit-notes`,
    arApOpts(),
  );
}

export function issueCreditNote(
  invoiceId: string,
  payload: CreateCreditNoteRequest,
  options?: { idempotencyKey?: string },
) {
  const headers: Record<string, string> = {};
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }
  return api.post<CreditNote>(
    `/ar-ap/invoices/${invoiceId}/credit-notes`,
    payload,
    { ...arApOpts(), headers },
  );
}

export function listCreditNotes(params?: ListCreditNotesParams) {
  const query: Record<string, string> = {};
  if (params?.invoice_id) query.invoice_id = params.invoice_id;
  if (params?.customer_id) query.customer_id = params.customer_id;
  if (params?.date_from) query.date_from = params.date_from;
  if (params?.date_to) query.date_to = params.date_to;
  return api.get<CreditNote[]>("/ar-ap/credit-notes", {
    ...arApOpts(),
    params: Object.keys(query).length ? query : undefined,
  });
}

export function getCreditNote(creditNoteId: string) {
  return api.get<CreditNote>(`/ar-ap/credit-notes/${creditNoteId}`, arApOpts());
}

// ── US-11 / US-12: vendor bills (accounts payable) ───────────────────────────

export type BillStatus = "draft" | "open" | "partial" | "paid" | "void";

export type BillLine = {
  id: string;
  account_id: string;
  gst_code_id: string | null;
  description: string | null;
  quantity: string | number;
  unit_price: string | number;
  gst_rate: string | number;
  line_total: string | number;
  gst_amount: string | number;
};

export type Bill = {
  id: string;
  tenant_id: string | null;
  vendor_id: string | null;
  bill_number: string;
  issue_date: string | null;
  due_date: string | null;
  status: BillStatus;
  subtotal: string | number;
  gst_amount: string | number;
  total: string | number;
  journal_entry_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  lines: BillLine[];
};

export type Vendor = {
  id: string;
  tenant_id: string | null;
  name: string;
  email: string | null;
};

export type BillLineRequest = {
  account_id: string;
  quantity: string;
  unit_price: string;
  description?: string | null;
  gst_code_id?: string | null;
  gst_rate?: string;
};

export type CreateBillRequest = {
  vendor_id: string;
  issue_date: string;
  due_date: string;
  lines: BillLineRequest[];
};

export type UpdateBillRequest = {
  vendor_id?: string;
  issue_date?: string;
  due_date?: string;
  lines?: BillLineRequest[];
};

export type ListBillsParams = {
  status?: BillStatus;
  vendor_id?: string;
  issued_from?: string;
  issued_to?: string;
};

export type CreateVendorRequest = {
  name: string;
  email?: string | null;
};

export type BillPayment = {
  id: string;
  tenant_id: string | null;
  bill_id: string;
  vendor_id: string | null;
  amount: string | number;
  payment_date: string | null;
  payment_method: PaymentMethod | string;
  reference: string | null;
  payment_account_id: string | null;
  journal_entry_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type BillSettlement = {
  bill_id: string;
  bill_total: string | number;
  amount_paid: string | number;
  outstanding: string | number;
};

export type CreateBillPaymentRequest = {
  payment_date: string;
  amount: string;
  payment_method: PaymentMethod;
  reference?: string | null;
  payment_account_id: string;
  idempotency_key?: string | null;
};

export type APAgingLine = {
  bill_id: string;
  vendor_id: string | null;
  bill_number: string;
  due_date: string | null;
  bill_total: string | number;
  amount_paid: string | number;
  outstanding: string | number;
  days_overdue: number;
  aging_bucket: string;
};

export function listBills(params?: ListBillsParams) {
  const query: Record<string, string> = {};
  if (params?.status) query.status = params.status;
  if (params?.vendor_id) query.vendor_id = params.vendor_id;
  if (params?.issued_from) query.issued_from = params.issued_from;
  if (params?.issued_to) query.issued_to = params.issued_to;
  return api.get<Bill[]>("/ar-ap/bills", {
    ...arApOpts(),
    params: Object.keys(query).length ? query : undefined,
  });
}

export function getBill(id: string) {
  return api.get<Bill>(`/ar-ap/bills/${id}`, arApOpts());
}

export function createBill(payload: CreateBillRequest) {
  return api.post<Bill>("/ar-ap/bills", payload, arApOpts());
}

export function updateBill(id: string, payload: UpdateBillRequest) {
  return api.put<Bill>(`/ar-ap/bills/${id}`, payload, arApOpts());
}

export function recordBill(id: string) {
  return api.post<Bill>(`/ar-ap/bills/${id}/record`, undefined, arApOpts());
}

export function deleteBill(id: string) {
  return api.delete<void>(`/ar-ap/bills/${id}`, arApOpts());
}

export function listVendors() {
  return api.get<Vendor[]>("/ar-ap/vendors", arApOpts());
}

export function createVendor(payload: CreateVendorRequest) {
  return api.post<Vendor>("/ar-ap/vendors", payload, arApOpts());
}

export function isDraftBill(bill: Bill): boolean {
  return bill.status === "draft";
}

export function isPostedBill(bill: Bill): boolean {
  return bill.status !== "draft" && bill.status !== "void";
}

export function canPayBill(bill: Bill): boolean {
  return bill.status === "open" || bill.status === "partial";
}

export function listBillPayments(billId: string) {
  return api.get<BillPayment[]>(`/ar-ap/bills/${billId}/payments`, arApOpts());
}

export function getBillSettlement(billId: string) {
  return api.get<BillSettlement>(
    `/ar-ap/bills/${billId}/settlement`,
    arApOpts(),
  );
}

export function payBill(
  billId: string,
  payload: CreateBillPaymentRequest,
  options?: { idempotencyKey?: string },
) {
  const headers: Record<string, string> = {};
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }
  return api.post<BillPayment>(`/ar-ap/bills/${billId}/payments`, payload, {
    ...arApOpts(),
    headers,
  });
}

export function getApAging(asOf?: string) {
  return api.get<APAgingLine[]>("/ar-ap/bills/ap-aging", {
    ...arApOpts(),
    params: asOf ? { as_of: asOf } : undefined,
  });
}

// ── US-15 / US-16: GST tracking and reporting ──────────────────────────────

export type GstKind = "output" | "input" | "zero_rated" | "exempt";

export type GstCode = {
  id: string;
  tenant_id: string | null;
  code: string;
  rate: string | number;
  gst_kind: GstKind;
  is_active: boolean;
};

export type GstSummary = {
  reporting_period: string;
  output_tax: string | number;
  input_tax: string | number;
  net_gst_payable: string | number;
  zero_rated_supplies: string | number;
  exempt_supplies: string | number;
};

export function listGstCodes(activeOnly = true) {
  return api.get<GstCode[]>("/ar-ap/gst/codes", {
    ...arApOpts(),
    params: {
      active_only: String(activeOnly),
    },
  });
}

export function initializeDefaultGstCodes() {
  return api.post<GstCode[]>(
    "/ar-ap/gst/codes/defaults",
    undefined,
    arApOpts(),
  );
}

export function getGstSummary(reportingPeriod: string) {
  return api.get<GstSummary>("/ar-ap/gst/summary", {
    ...arApOpts(),
    params: {
      reporting_period: reportingPeriod,
    },
  });
}

export async function downloadGstSummaryCsv(
  reportingPeriod: string,
): Promise<Blob> {
  const opts = arApOpts();
  const base = opts.baseUrl.replace(/\/$/, "");
  const path = `/ar-ap/gst/export?reporting_period=${encodeURIComponent(reportingPeriod)}`;
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
    throw new Error(`GST CSV download failed (${response.status})`);
  }

  return response.blob();
}

// ── US-13: bank statement upload ─────────────────────────────────────────────

export type BankTransaction = {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string | null;
  amount: string;
  matched: boolean;
  journal_entry_id: string | null;
  checksum_hash: string | null;
  upload_batch_id: string | null;
  reconciliation_entity_type: string | null;
  reconciliation_entity_id: string | null;
  created_at: string;
};

export type UploadBankStatementRequest = {
  bank_account_id: string;
  csv_content: string;
};

export function uploadBankStatement(payload: UploadBankStatementRequest) {
  return api.post<BankTransaction[]>(
    "/ar-ap/bank-statements/upload",
    payload,
    arApOpts(),
  );
}

// ── US-14: reconciliation ────────────────────────────────────────────────────

export type ReconciliationSuggestion = {
  bank_transaction_id: string;
  match_type: string;
  match_id: string;
  match_label: string;
  match_amount: string;
  difference: string;
  confidence: string;
};

export type ReconcileTransactionRequest = {
  transaction_id: string;
  match_type: string;
  match_id: string | null;
  account_id: string;
};

export function listUnmatched(bankAccountId?: string) {
  return api.get<BankTransaction[]>("/ar-ap/bank-transactions/unmatched", {
    ...arApOpts(),
    ...(bankAccountId
      ? { params: { bank_account_id: bankAccountId } as Record<string, string> }
      : {}),
  });
}

export function listMatched(bankAccountId?: string) {
  return api.get<BankTransaction[]>("/ar-ap/bank-transactions/matched", {
    ...arApOpts(),
    ...(bankAccountId
      ? { params: { bank_account_id: bankAccountId } as Record<string, string> }
      : {}),
  });
}

export function getReconciliationSuggestions(transactionId: string) {
  return api.get<ReconciliationSuggestion[]>(
    `/ar-ap/bank-transactions/${transactionId}/suggestions`,
    arApOpts(),
  );
}

export function reconcileTransaction(payload: ReconcileTransactionRequest) {
  return api.post<BankTransaction>(
    "/ar-ap/bank-transactions/reconcile",
    payload,
    arApOpts(),
  );
}

// ── bank accounts (needed by US-13/US-14) ────────────────────────────────────

export type BankAccount = {
  id: string;
  tenant_id: string | null;
  name: string;
  account_number: string | null;
  currency: string;
  opening_balance: string;
};

export type CreateBankAccountRequest = {
  name: string;
  account_number?: string | null;
  currency?: string;
  opening_balance?: string;
};

export function listBankAccounts() {
  return api.get<BankAccount[]>("/ar-ap/bank-accounts", arApOpts());
}

export function createBankAccount(payload: CreateBankAccountRequest) {
  return api.post<BankAccount>("/ar-ap/bank-accounts", payload, arApOpts());
}
