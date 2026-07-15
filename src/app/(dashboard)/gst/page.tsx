"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  downloadGstSummaryCsv,
  getGstSummary,
  initializeDefaultGstCodes,
  listGstCodes,
  type GstCode,
  type GstSummary,
} from "@/lib/ar-ap-api";
import { formatApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format-money";

function currentQuarter(): string {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;

  return `${now.getFullYear()}-Q${quarter}`;
}

type SummaryMetricProps = {
  label: string;
  value: string | number;
  description: string;
};

function SummaryMetric({ label, value, description }: SummaryMetricProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-2xl">
          {formatMoney(value)}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function GstReportingPage() {
  const initialPeriod = currentQuarter();

  const [reportingPeriod, setReportingPeriod] = useState(initialPeriod);
  const [loadedPeriod, setLoadedPeriod] = useState(initialPeriod);
  const [summary, setSummary] = useState<GstSummary | null>(null);
  const [gstCodes, setGstCodes] = useState<GstCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (period: string) => {
    setLoading(true);
    setError(null);

    try {
      const [codesResult, summaryResult] = await Promise.all([
        listGstCodes(),
        getGstSummary(period),
      ]);

      setGstCodes(codesResult);
      setSummary(summaryResult);
      setLoadedPeriod(period);
    } catch (loadError) {
      const message = formatApiError(loadError);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReport(initialPeriod);
  }, [initialPeriod, loadReport]);

  async function handleLoadReport() {
    const normalizedPeriod = reportingPeriod.trim().toUpperCase();

    if (!/^\d{4}-Q[1-4]$/.test(normalizedPeriod)) {
      toast.error("Reporting period must use the format YYYY-Q1 to YYYY-Q4.");
      return;
    }

    setReportingPeriod(normalizedPeriod);
    await loadReport(normalizedPeriod);
  }

  async function handleInitializeDefaults() {
    setInitializing(true);

    try {
      await initializeDefaultGstCodes();

      const refreshedCodes = await listGstCodes();
      setGstCodes(refreshedCodes);

      toast.success("Default GST codes initialized.");
    } catch (initializeError) {
      toast.error(formatApiError(initializeError));
    } finally {
      setInitializing(false);
    }
  }

  async function handleExport() {
    setExporting(true);

    try {
      const blob = await downloadGstSummaryCsv(loadedPeriod);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `gst-summary-${loadedPeriod}.csv`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);

      toast.success(`GST report for ${loadedPeriod} downloaded.`);
    } catch (exportError) {
      toast.error(formatApiError(exportError));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">GST Reporting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review output tax, input tax, and GST payable for a quarterly
          reporting period.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reporting period</CardTitle>
          <CardDescription>
            Enter a quarterly reporting period using the format YYYY-Q1 to
            YYYY-Q4.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full max-w-xs space-y-2">
            <label
              htmlFor="gst-reporting-period"
              className="text-sm font-medium"
            >
              Quarter
            </label>

            <Input
              id="gst-reporting-period"
              value={reportingPeriod}
              placeholder="2026-Q3"
              disabled={loading}
              onChange={(event) =>
                setReportingPeriod(event.target.value.toUpperCase())
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleLoadReport();
                }
              }}
            />
          </div>

          <Button
            type="button"
            disabled={loading}
            onClick={() => void handleLoadReport()}
          >
            {loading ? "Loading..." : "Load report"}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={loading || exporting || summary === null}
            onClick={() => void handleExport()}
          >
            {exporting ? "Exporting..." : "Download CSV"}
          </Button>
        </CardContent>
      </Card>

      {gstCodes.length === 0 && !loading ? (
        <Card>
          <CardHeader>
            <CardTitle>GST codes are not configured</CardTitle>
            <CardDescription>
              Initialize the standard GST codes before creating taxable invoices
              and bills.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              type="button"
              disabled={initializing}
              onClick={() => void handleInitializeDefaults()}
            >
              {initializing
                ? "Initializing..."
                : "Initialize default GST codes"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Summary for {summary.reporting_period || loadedPeriod}
              </h2>
              <p className="text-sm text-muted-foreground">
                {gstCodes.length} active GST code
                {gstCodes.length === 1 ? "" : "s"} configured.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryMetric
              label="Output tax"
              value={summary.output_tax}
              description="GST collected from customer invoices, less credit notes."
            />

            <SummaryMetric
              label="Input tax"
              value={summary.input_tax}
              description="GST paid on eligible vendor bills."
            />

            <SummaryMetric
              label="Net GST payable"
              value={summary.net_gst_payable}
              description="Output tax minus input tax. A negative value indicates a refund position."
            />

            <SummaryMetric
              label="Zero-rated supplies"
              value={summary.zero_rated_supplies}
              description="Taxable supplies charged at a zero GST rate."
            />

            <SummaryMetric
              label="Exempt supplies"
              value={summary.exempt_supplies}
              description="Supplies that are exempt from GST."
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
