import { describe, it, expect } from "bun:test";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  parseCurrency,
  todayISO,
  myShare,
  ownershipLabel,
} from "./format";

describe("formatCurrency", () => {
  it("formats whole numbers", () => {
    expect(formatCurrency(15000)).toBe("$15.000");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats large numbers", () => {
    expect(formatCurrency(85000)).toBe("$85.000");
  });

  it("formats small numbers", () => {
    expect(formatCurrency(500)).toBe("$500");
  });
});

describe("formatDate", () => {
  it("formats ISO date to es-AR short format", () => {
    const result = formatDate("2026-07-05");
    expect(result).toContain("05");
    expect(result).toContain("jul");
  });
});

describe("formatMonth", () => {
  it("formats YYYY-MM to a readable month", () => {
    expect(formatMonth("2026-07")).toContain("julio");
    expect(formatMonth("2026-07")).toContain("2026");
  });
});

describe("todayISO", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("parseCurrency", () => {
  it("parses plain digits", () => {
    expect(parseCurrency("1234")).toBe(1234);
  });

  it("parses es-AR style with dot thousands and comma decimals", () => {
    expect(parseCurrency("$1.234,56")).toBe(1234.56);
  });

  it("parses dot as decimal when not a thousand grouping", () => {
    expect(parseCurrency("1.5")).toBe(1.5);
  });

  it("parses dots-only as thousands separators (es-AR)", () => {
    expect(parseCurrency("1.200.000")).toBe(1200000);
    expect(parseCurrency("12.500")).toBe(12500);
    expect(parseCurrency("$1.234.567")).toBe(1234567);
  });

  it("parses en-US style with comma thousands and dot decimals", () => {
    expect(parseCurrency("1,234.56")).toBe(1234.56);
  });

  it("parses commas-only as thousands separators (en-US)", () => {
    expect(parseCurrency("1,234,567")).toBe(1234567);
  });

  it("parses comma as decimal when not a thousand grouping", () => {
    expect(parseCurrency("1,5")).toBe(1.5);
  });

  it("returns NaN for empty input", () => {
    expect(parseCurrency("")).toBeNaN();
  });

  it("returns NaN for non-numeric input", () => {
    expect(parseCurrency("abc")).toBeNaN();
  });
});

describe("myShare", () => {
  it("calculates 100% share", () => {
    expect(myShare(1000, 100)).toBe(1000);
  });

  it("calculates 50% share", () => {
    expect(myShare(1000, 50)).toBe(500);
  });

  it("calculates 0% share", () => {
    expect(myShare(1000, 0)).toBe(0);
  });

  it("rounds correctly", () => {
    expect(myShare(100, 33)).toBe(33);
  });
});

describe("ownershipLabel", () => {
  it("returns '100% yo' for full ownership", () => {
    expect(ownershipLabel(100)).toBe("100% yo");
  });

  it("includes person name when shared", () => {
    expect(ownershipLabel(50, "Lourdes")).toBe("50% (Lourdes)");
  });

  it("returns percentage without person when no person", () => {
    expect(ownershipLabel(0)).toBe("0%");
  });
});
