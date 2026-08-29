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

/**
 * Normalize API gst_rate (decimal fraction) for form/calc.
 * Derives rate from line totals when stored rate is zero but GST applies.
 */
export function normalizeGstRateDecimal(
  gstRate: string | number,
  lineTotal?: string | number,
  gstAmount?: string | number,
): string {
  const rate = Number.parseFloat(String(gstRate));
  if (Number.isFinite(rate) && rate > 0) {
    // Values > 1 were likely entered as a whole-number percent (e.g. 9 for 9%).
    return rate > 1 ? String(rate / 100) : String(rate);
  }
  const net = Number(lineTotal);
  const gst = Number(gstAmount);
  if (Number.isFinite(net) && net > 0 && Number.isFinite(gst) && gst > 0) {
    return String(gst / net);
  }
  return "0";
}

/** Display decimal gst_rate (0.09) as a whole-number percent string (9). */
export function gstRateDecimalToPercent(rate: string): string {
  const n = parseAmount(rate);
  if (n <= 0) return "0";
  const pct = roundMoney(n * 100);
  return Number.isInteger(pct) ? String(pct) : String(pct);
}

/** Parse percent input (9) to decimal gst_rate string (0.09) for API/calc. */
export function gstRatePercentToDecimal(percent: string): string {
  const n = parseAmount(percent);
  if (n <= 0) return "0";
  return String(n / 100);
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
