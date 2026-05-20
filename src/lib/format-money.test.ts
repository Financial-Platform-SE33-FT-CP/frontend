import { describe, expect, it } from "vitest";
import { formatAccountType, formatMoney } from "./format-money";

describe("formatMoney", () => {
  it("formats decimal strings with two fraction digits", () => {
    expect(formatMoney("1234.5")).toMatch(/1,234\.50|1\.234,50/);
  });

  it("returns em dash for empty values", () => {
    expect(formatMoney(null)).toBe("—");
  });
});

describe("formatAccountType", () => {
  it("title-cases snake_case types", () => {
    expect(formatAccountType("cost_of_goods_sold")).toBe("Cost Of Goods Sold");
  });
});
