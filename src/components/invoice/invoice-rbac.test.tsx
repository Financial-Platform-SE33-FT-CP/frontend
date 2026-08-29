import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { canEditAccountingData } from "@/lib/tenant-roles";

describe("InvoiceStatusBadge", () => {
  it("renders draft label", () => {
    render(<InvoiceStatusBadge status="draft" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders issued label", () => {
    render(<InvoiceStatusBadge status="issued" />);
    expect(screen.getByText("Issued")).toBeInTheDocument();
  });
});

describe("invoice RBAC helpers", () => {
  it("allows owner and accountant to edit", () => {
    expect(canEditAccountingData("admin")).toBe(true);
    expect(canEditAccountingData("manager")).toBe(true);
  });

  it("denies viewer edit", () => {
    expect(canEditAccountingData("viewer")).toBe(false);
  });
});
