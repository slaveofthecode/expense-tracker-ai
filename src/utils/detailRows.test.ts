import { describe, it, expect } from "bun:test";
import type { Expense } from "../types";
import { buildDetailRows, findRowContaining } from "./detailRows";

function expense(overrides: Partial<Expense> & { id: string; date: string }): Expense {
  return {
    itemId: "gus",
    description: "Alquiler",
    amount: 560000,
    installments: undefined,
    ownership: { percentage: 100, person: undefined },
    ...overrides,
  };
}

const threeMonths = (id: string, month: string) =>
  expense({ id, date: `2026-${month}-10` });

describe("buildDetailRows", () => {
  it("merges fixed-months records into one row spanning their months", () => {
    const rows = buildDetailRows(
      [
        threeMonths("a", "08"),
        threeMonths("b", "09"),
        threeMonths("c", "10"),
      ],
      2026,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("Alquiler");
    expect(rows[0].badge).toBe("");
    expect(rows[0].monthlyAmount).toBe(560000);
    expect([...rows[0].coveredMonths].sort()).toEqual([7, 8, 9]);
    expect(rows[0].expenseIds).toEqual(["a", "b", "c"]);
    expect(rows[0].firstInstallmentMonth).toBeNull();
  });

  it("does not merge records with different amounts", () => {
    const rows = buildDetailRows(
      [threeMonths("a", "08"), expense({ id: "b", date: "2026-09-10", amount: 600000 })],
      2026,
    );
    expect(rows).toHaveLength(2);
  });

  it("does not merge records with different descriptions", () => {
    const rows = buildDetailRows(
      [threeMonths("a", "08"), expense({ id: "b", date: "2026-09-10", description: "Expensa" })],
      2026,
    );
    expect(rows).toHaveLength(2);
  });

  it("keeps installment records on their own row with badge and first cuota", () => {
    const rows = buildDetailRows(
      [
        expense({
          id: "tv",
          date: "2026-03-05",
          description: "TV",
          amount: 600000,
          installments: { total: 6, current: 2 },
        }),
      ],
      2026,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].badge).toBe(" en 6 ctas");
    expect(rows[0].monthlyAmount).toBe(100000);
    expect([...rows[0].coveredMonths]).toEqual([2, 3, 4, 5, 6, 7]);
    expect(rows[0].firstInstallmentMonth).toBe(2);
  });

  it("never merges an installment record with same-description singles", () => {
    const rows = buildDetailRows(
      [
        threeMonths("a", "08"),
        expense({
          id: "tv",
          date: "2026-09-10",
          amount: 560000,
          installments: { total: 3, current: 1 },
        }),
      ],
      2026,
    );
    expect(rows).toHaveLength(2);
  });

  it("filters out records that do not touch the given year", () => {
    const rows = buildDetailRows(
      [threeMonths("a", "08"), expense({ id: "old", date: "2025-12-01" })],
      2026,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].expenseIds).toEqual(["a"]);
  });

  it("does not merge records with different ownership profiles", () => {
    const rows = buildDetailRows(
      [
        threeMonths("a", "08"),
        expense({
          id: "b",
          date: "2026-09-10",
          ownership: { percentage: 50, person: "Gus" },
        }),
      ],
      2026,
    );
    expect(rows).toHaveLength(2);
  });

  it("marks shared ownership and orders members by date regardless of insertion", () => {
    const rows = buildDetailRows(
      [
        expense({ id: "late", date: "2026-10-10", ownership: { percentage: 50, person: "Gus" } }),
        expense({
          id: "early",
          date: "2026-08-10",
          ownership: { percentage: 50, person: "Gus" },
        }),
      ],
      2026,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].expenseIds).toEqual(["early", "late"]);
    expect(rows[0].isShared).toBe(true);
  });
});

describe("findRowContaining", () => {
  it("maps any member id to its merged row index", () => {
    const rows = buildDetailRows(
      [threeMonths("a", "08"), threeMonths("b", "09")],
      2026,
    );
    expect(findRowContaining(rows, "b")).toBe(0);
    expect(findRowContaining(rows, "zzz")).toBe(-1);
  });
});
