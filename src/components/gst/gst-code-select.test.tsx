import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GstCodeSelect } from "@/components/gst/gst-code-select";
import type { GstCode } from "@/lib/ar-ap-api";

const gstCodes: GstCode[] = [
  {
    id: "gst-output",
    tenant_id: "tenant-1",
    code: "SR-OUTPUT",
    rate: "0.09",
    gst_kind: "output",
    is_active: true,
  },
  {
    id: "gst-input",
    tenant_id: "tenant-1",
    code: "SR-INPUT",
    rate: "0.09",
    gst_kind: "input",
    is_active: true,
  },
  {
    id: "gst-zero",
    tenant_id: "tenant-1",
    code: "ZERO",
    rate: "0",
    gst_kind: "zero_rated",
    is_active: true,
  },
  {
    id: "gst-exempt",
    tenant_id: "tenant-1",
    code: "EXEMPT",
    rate: "0",
    gst_kind: "exempt",
    is_active: true,
  },
  {
    id: "gst-inactive",
    tenant_id: "tenant-1",
    code: "OLD-OUTPUT",
    rate: "0.07",
    gst_kind: "output",
    is_active: false,
  },
];

describe("GstCodeSelect", () => {
  it("shows only active GST codes with allowed kinds", () => {
    render(
      <GstCodeSelect
        value=""
        codes={gstCodes}
        allowedKinds={["output", "zero_rated", "exempt"]}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole("option", { name: "No GST" })).toBeInTheDocument();

    expect(
      screen.getByRole("option", { name: /SR-OUTPUT/ }),
    ).toBeInTheDocument();

    expect(screen.getByRole("option", { name: /ZERO/ })).toBeInTheDocument();

    expect(screen.getByRole("option", { name: /EXEMPT/ })).toBeInTheDocument();

    expect(
      screen.queryByRole("option", { name: /SR-INPUT/ }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("option", { name: /OLD-OUTPUT/ }),
    ).not.toBeInTheDocument();
  });

  it("returns the selected GST code and null for No GST", () => {
    const onChange = vi.fn();

    render(
      <GstCodeSelect
        value=""
        codes={gstCodes}
        allowedKinds={["output", "zero_rated", "exempt"]}
        onChange={onChange}
      />,
    );

    const select = screen.getByRole("combobox");

    fireEvent.change(select, {
      target: { value: "gst-output" },
    });

    expect(onChange).toHaveBeenLastCalledWith(gstCodes[0]);

    fireEvent.change(select, {
      target: { value: "" },
    });

    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
