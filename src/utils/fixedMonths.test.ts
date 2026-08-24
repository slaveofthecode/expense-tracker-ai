import { describe, it, expect } from "bun:test";
import type { NewExpense } from "../types";
import {
  MAX_FIXED_MONTHS,
  expandFixedMonths,
  fixedMonthsPreview,
} from "./fixedMonths";

const base: NewExpense = {
  itemId: "home-1",
  description: "Alquiler",
  amount: 560000,
  date: "2026-08-24",
  ownership: { percentage: 100 },
};

describe("expandFixedMonths", () => {
  it("creates one identical record per month with consecutive dates", () => {
    const result = expandFixedMonths(base, 4);
    expect(result).toHaveLength(4);
    expect(result.map((e) => e.date)).toEqual([
      "2026-08-24",
      "2026-09-24",
      "2026-10-24",
      "2026-11-24",
    ]);
    for (const expense of result) {
      expect(expense.itemId).toBe(base.itemId);
      expect(expense.description).toBe(base.description);
      expect(expense.amount).toBe(base.amount);
      expect(expense.ownership).toEqual(base.ownership);
      expect(expense.installments).toBeUndefined();
    }
  });

  it("clamps the day to the last day of shorter months", () => {
    const jan31 = expandFixedMonths(
      { ...base, date: "2027-01-31" },
      3,
    ).map((e) => e.date);
    expect(jan31).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });

  it("handles february 29 on leap years", () => {
    const result = expandFixedMonths({ ...base, date: "2028-02-29" }, 2);
    expect(result.map((e) => e.date)).toEqual(["2028-02-29", "2028-03-29"]);
  });

  it("crosses year boundaries", () => {
    const result = expandFixedMonths({ ...base, date: "2026-11-10" }, 3);
    expect(result.map((e) => e.date)).toEqual([
      "2026-11-10",
      "2026-12-10",
      "2027-01-10",
    ]);
  });

  it("returns a single record when months is 1", () => {
    const result = expandFixedMonths(base, 1);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-08-24");
  });

  it("rejects invalid month counts and installment combinations", () => {
    for (const months of [0, -1, 1.5, NaN, MAX_FIXED_MONTHS + 1]) {
      expect(() => expandFixedMonths(base, months)).toThrow();
    }
    expect(() =>
      expandFixedMonths(
        {
          ...base,
          installments: { total: 3, current: 1 },
        },
        4,
      ),
    ).toThrow("excluyentes");
  });
});

describe("fixedMonthsPreview", () => {
  it("describes the range within the same year", () => {
    expect(fixedMonthsPreview("2026-08-24", 4)).toBe(
      "Se crearán 4 registros: ago 2026 – nov 2026",
    );
  });

  it("describes ranges that cross a year boundary", () => {
    expect(fixedMonthsPreview("2026-11-10", 3)).toBe(
      "Se crearán 3 registros: nov 2026 – ene 2027",
    );
  });
});
