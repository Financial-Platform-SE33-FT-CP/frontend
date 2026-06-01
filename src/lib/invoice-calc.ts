/** Client-side invoice line/total preview (backend remains source of truth). */

export type LineCalcInput = {
  quantity: string;
  unit_price: string;
  gst_rate: string;
};

export type LineCalcResult = {
  line_total: number;
  gst_amount: number;
  line_gross: number;
};

export type InvoiceTotalsPreview = {
  subtotal: number;
  gst_amount: number;
  total: number;
};

function parseAmount(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Round to 2 dp (half-up), matching backend _money(). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcLinePreview(input: LineCalcInput): LineCalcResult {
  const qty = parseAmount(input.quantity);
  const price = parseAmount(input.unit_price);
  const rate = parseAmount(input.gst_rate);
  const line_total = roundMoney(qty * price);
  const gst_amount = roundMoney(line_total * rate);
  return {
    line_total,
    gst_amount,
    line_gross: roundMoney(line_total + gst_amount),
  };
}

export function calcInvoiceTotalsPreview(
  lines: LineCalcInput[],
): InvoiceTotalsPreview {
  let subtotal = 0;
  let gst = 0;
  for (const line of lines) {
    const preview = calcLinePreview(line);
    subtotal += preview.line_total;
    gst += preview.gst_amount;
  }
  subtotal = roundMoney(subtotal);
  gst = roundMoney(gst);
  return {
    subtotal,
    gst_amount: gst,
    total: roundMoney(subtotal + gst),
  };
}
