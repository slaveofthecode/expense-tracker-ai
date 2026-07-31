import { describe, it, expect } from "bun:test";
import { formatCurrency, formatDate, myShare, ownershipLabel } from "./format";

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
  it("returns '100% me' for full ownership", () => {
    expect(ownershipLabel(100)).toBe("100% me");
  });

  it("includes person name when shared", () => {
    expect(ownershipLabel(50, "Lourdes")).toBe("50% (Lourdes)");
  });

  it("returns percentage without person when no person", () => {
    expect(ownershipLabel(0)).toBe("0%");
  });
});
